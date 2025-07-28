#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

function getCurrentVersion(): string {
  try {
    const packagePath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

    if (!packageJson.version) {
      throw new Error('Missing "version" field in package.json')
    }

    return packageJson.version
  } catch (error) {
    throw new Error(
      `Failed to get current version: ${(error as Error).message}`
    )
  }
}

function isHasTag(): boolean {
  try {
    const tags = execSync('git tag', { encoding: 'utf8' }).trim()
    return tags.length > 0
  } catch (error) {
    throw new Error(`Failed to check for git tags: ${(error as Error).message}`)
  }
}

function getVersionBumpType(): string | null {
  try {
    const latestTag = execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()

    const commitCommand = latestTag
      ? `git log ${latestTag}..HEAD --pretty=format:"%s%n%b"`
      : 'git log --pretty=format:"%s%n%b"'

    const commits = execSync(commitCommand, { encoding: 'utf8' }).trim()

    if (!commits) {
      return null
    }

    const commitLines = commits.split('\n\n')

    if (
      commitLines.some(
        (line) =>
          line.includes('BREAKING CHANGE') || line.includes('BREAKING CHANGES')
      )
    ) {
      return 'major'
    }

    if (commitLines.some((line) => /^feat(\([^)]+\))?:/.test(line))) {
      return 'minor'
    }

    if (commitLines.some((line) => /^fix(\([^)]+\))?:/.test(line))) {
      return 'patch'
    }

    return null
  } catch (error) {
    throw new Error(`Failed to analyze commits: ${(error as Error).message}`)
  }
}

function incrementVersion(currentVersion: string, bumpType: string): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number)

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      throw new Error(`Unknown bump version type: ${bumpType}`)
  }
}

function updatePackageJson(version: string): void {
  try {
    const packagePath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    packageJson.version = version

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', {
      encoding: 'utf8'
    })
  } catch (error) {
    throw new Error(
      `Failed to update package version: ${(error as Error).message}`
    )
  }
}

export default function main(): void {
  try {
    const currentVersion = getCurrentVersion()
    const hasTag = isHasTag()

    if (!hasTag) {
      console.log(
        '🫠 No tags found. Please run script to init CHANGELOG.md first, then create first tag.'
      )
      process.exit(0)
    }

    const bumpType = getVersionBumpType()

    if (!bumpType) {
      console.log('🫠 No new commits or version bump required. Skipping...')
      process.exit(0)
    }

    const newVersion = incrementVersion(currentVersion, bumpType)
    updatePackageJson(newVersion)

    console.log(`✨ Successfully updated version to v${newVersion}`)
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
