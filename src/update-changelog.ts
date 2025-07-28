#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

function getRepoUrl(): string {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()

    // SSH
    if (remoteUrl.startsWith('git@')) {
      const match = remoteUrl.match(/git@([^:]+):(.+)\.git$/)
      if (match) {
        const [, host, path] = match
        return `https://${host}/${path}`
      }
    }

    // HTTPS
    if (remoteUrl.startsWith('https://')) {
      return remoteUrl.replace(/\.git$/, '')
    }

    throw new Error('Unsupported remote URL format')
  } catch (error) {
    throw new Error(`Failed to get repository URL: ${(error as Error).message}`)
  }
}

function getRepoInfo(): { owner: string; name: string; repoUrl: string } {
  const repoUrl = getRepoUrl()
  const match = repoUrl.match(/https:\/\/([^/]+)\/([^/]+)\/([^/]+)$/)

  if (!match) {
    throw new Error('Could not parse repository owner and name from URL')
  }

  const [, , owner, name] = match
  return { owner, name, repoUrl }
}

const repoInfo = getRepoInfo()

interface Config {
  types: Record<string, { title: string }>
  repo: {
    owner: string
    name: string
    repoUrl: string
  }
}

interface VersionInfo {
  version: string
  date: string
  compareUrl?: string | null
}

interface Commit {
  type: string
  scope: string | null
  subject: string
}

interface Changelog {
  full: string
  releaseNotes: string
}

const CONFIG: Config = {
  types: {
    feat: { title: 'Features' },
    fix: { title: 'Bug Fixes' }
  },
  repo: repoInfo
}

function getLastTag(): string | null {
  try {
    const tags = execSync('git tag --sort=-creatordate', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .trim()
      .split('\n')
      .filter(Boolean)

    if (tags.length === 0) {
      return null
    }

    return tags[0]
  } catch (error) {
    throw new Error(`Failed to get git tags: ${(error as Error).message}`)
  }
}

function parseVersionParts(v: string): number[] {
  if (!v) return [0, 0, 0]

  return v
    .replace(/^v/, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
}

function compareVersion(version: string, lastTag: string | null): boolean {
  if (!lastTag) return true

  const [major1, minor1, patch1] = parseVersionParts(version)
  const [major2, minor2, patch2] = parseVersionParts(lastTag)

  const isVersionGreater =
    major1 > major2 ||
    (major1 === major2 && minor1 > minor2) ||
    (major1 === major2 && minor1 === minor2 && patch1 > patch2)

  if (!isVersionGreater) {
    throw new Error(
      `Version "${version}" is not greater than last tag "${lastTag}"`
    )
  }

  return true
}

function getVersionInfo(version: string, lastTag: string | null): VersionInfo {
  const normalizedVersion = version.replace(/^v/, '')
  let compareUrl = ''

  if (lastTag) {
    const hasVPrefix = /^v/.test(lastTag)
    const newTag = hasVPrefix ? `v${normalizedVersion}` : normalizedVersion
    compareUrl = `${CONFIG.repo.repoUrl}/compare/${lastTag}...${newTag}`
  }

  return {
    version: normalizedVersion,
    date: new Date().toISOString().split('T')[0],
    compareUrl
  }
}

function getCommits(lastTag: string | null): string[] {
  try {
    const command = lastTag
      ? `git log ${lastTag}..HEAD --pretty=format:"%s %b"`
      : `git log --pretty=format:"%s %b"`

    const output = execSync(command, { encoding: 'utf8' }).trim()
    return output.split('\n').filter(Boolean)
  } catch (error) {
    throw new Error(`Failed to get git logs: ${(error as Error).message}`)
  }
}

function parseCommits(commits: string[]): Commit[] {
  const regex = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/
  return commits
    .map((commit) => {
      const match = commit.match(regex)
      if (!match) return null
      const [, type, scope, subject] = match
      return { type, scope: scope || null, subject }
    })
    .filter((commit): commit is Commit => commit !== null)
}

function groupCommits(parsedCommits: Commit[]): Record<string, string[]> {
  const groupedCommits = Object.keys(CONFIG.types).reduce(
    (acc, key) => {
      acc[key] = []
      return acc
    },
    {} as Record<string, string[]>
  )

  parsedCommits.forEach((commit) => {
    if (CONFIG.types[commit.type] && commit.subject) {
      groupedCommits[commit.type].push(commit.subject)
    }
  })

  return groupedCommits
}

function generateChangelog(
  versionInfo: VersionInfo,
  groupedCommits: Record<string, string[]>
): Changelog {
  // Changelog title
  let changelogContent = '## Changelog\n'

  // version info
  changelogContent += versionInfo.compareUrl
    ? `\n### [${versionInfo.version}](${versionInfo.compareUrl}) (${versionInfo.date})\n`
    : `\n### ${versionInfo.version} (${versionInfo.date})\n`

  const hasContent = Object.values(groupedCommits).some((arr) => arr.length > 0)
  if (!hasContent) {
    changelogContent +=
      '\n- No significant changes (initial release or maintenance update).\n'
    return { full: changelogContent, releaseNotes: changelogContent }
  }

  // commit type
  for (const type of Object.keys(groupedCommits)) {
    const commits = groupedCommits[type]
    if (commits.length === 0) continue

    // commit type title
    changelogContent += `\n#### ${CONFIG.types[type].title}\n`

    // commits parse for pr number
    const commitsContent = commits.map((commit) => {
      const replacedCommit = commit.replace(
        /\(#(\d+)\)|#(\d+)/g,
        (_, pr1, pr2) => {
          const prNumber = pr1 || pr2
          return `([#${prNumber}](${CONFIG.repo.repoUrl}/pull/${prNumber}))`
        }
      )
      return `- ${replacedCommit}`
    })

    changelogContent += `\n${commitsContent.join('\n')}\n`
  }

  const releaseNotes = changelogContent
    .replace(/^## Changelog\n+/, '')
    .replace(/^###\s.*\n+/, '')

  return { full: changelogContent, releaseNotes }
}

function writeChangelog(changelog: Changelog): void {
  try {
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md')
    const releaseNotesPath = path.join(process.cwd(), '.RELEASE_NOTES.md')

    let content = ''

    if (!fs.existsSync(changelogPath)) {
      content = changelog.full
    } else {
      const existingContent = fs.readFileSync(changelogPath, 'utf8')
      if (existingContent.includes('## Changelog\n')) {
        content = existingContent.replace('## Changelog\n', changelog.full)
      } else {
        content = changelog.full + existingContent
      }
    }

    fs.writeFileSync(changelogPath, content, 'utf8')
    fs.writeFileSync(releaseNotesPath, changelog.releaseNotes, 'utf8')
  } catch (error) {
    throw new Error(`Failed to write changelog: ${(error as Error).message}`)
  }
}

export default function main(): void {
  try {
    const packagePath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const version = packageJson.version

    if (!version) {
      throw new Error('Missing "version" field in package.json')
    }

    const lastTag = getLastTag()

    if (!lastTag) {
      console.log('⚠️ No tags found. Creating initial changelog...\n')
    }

    compareVersion(version, lastTag)

    const versionInfo = getVersionInfo(version, lastTag)
    const commits = getCommits(lastTag)
    const parsedCommits = parseCommits(commits)
    const groupedCommits = groupCommits(parsedCommits)
    const changelog = generateChangelog(versionInfo, groupedCommits)

    writeChangelog(changelog)

    console.log('✨ Successfully updated CHANGELOG.md')
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ ${error.message}`)
    } else {
      console.error('❌ An unknown error occurred')
    }
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
