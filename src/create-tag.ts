import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import * as readline from 'readline'
import chalk from 'chalk'
import log from './utils/log.js'
import { SCRIPT_NAME } from './config/constants.js'

const packagePath = path.join(process.cwd(), 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
const version = packageJson.version

const scriptNameWithStyle = chalk.bold.cyan(`[${SCRIPT_NAME}]`)
const tipWithStyle = chalk.yellow(
  '⚠️ This operation will perform git add, commit, and tag actions.'
)
const questionWithStyle = `Are you sure you want to create a Git commit and tag for v${version}? (y/N):`
const RL_QUESTION = `${scriptNameWithStyle} ${tipWithStyle}
${scriptNameWithStyle} ${questionWithStyle}`

function gitAddCommitAndTag(): void {
  execSync('git add ./')
  execSync(`git commit -m "chore: release v${version}"`)
  log.success(`Git committed with message: "chore: Release v${version}"`)
  execSync(`git tag -a v${version} -m "release v${version}"`)
  log.success(`Git tag created: v${version}`)
}

export default function createTag(): Promise<void> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question(RL_QUESTION, (answer) => {
      if (answer.trim().toLowerCase() === 'y') {
        try {
          gitAddCommitAndTag()
          resolve()
        } catch (error) {
          reject(error)
        }
      } else {
        log.info('Aborted git tag creation, nothing changed.')
        resolve()
      }
      rl.close()
    })
  })
}

// if run directly, execute interactive process
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  createTag()
}
