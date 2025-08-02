#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import log from './utils/log'

const isDryRun = process.argv.includes('--dry-run')
const packagePath = path.join(process.cwd(), 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
let currentVersion: string = ''
let newVersion: string = ''

const getCurrentVersion = (): string => {
  try {
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

const isHasTag = (): boolean => {
  try {
    const tags = execSync('git tag', { encoding: 'utf8' }).trim()
    return tags.length > 0
  } catch (error) {
    throw new Error(`Failed to check for git tags: ${(error as Error).message}`)
  }
}

const getVersionBumpType = (): string | null => {
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

const incrementVersion = (bumpType: string): string => {
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

const updatePackageJsonVersion = (version: string): void => {
  try {
    packageJson.version = version

    if (isDryRun) {
      log.info(`Dry run complete. Version would be updated to v${newVersion}`)
      process.exit(0)
    }

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', {
      encoding: 'utf8'
    })
  } catch (error) {
    throw new Error(
      `Failed to update package version: ${(error as Error).message}`
    )
  }
}

const main = (): void => {
  log.info('Starting version update process...')
  try {
    currentVersion = getCurrentVersion()
    const hasTag = isHasTag()

    if (!hasTag) {
      log.warn('No tags found. Please create a tag first.')
      process.exit(0)
    }

    const bumpType = getVersionBumpType()

    if (!bumpType) {
      log.info('No new commits or version bump required. Skipping...')
      process.exit(0)
    }

    newVersion = incrementVersion(bumpType)
    updatePackageJsonVersion(newVersion)

    log.success(`Successfully updated version to v${newVersion}`)
  } catch (error) {
    log.error(`${(error as Error).message}`)
    process.exit(1)
  }
}

main()
