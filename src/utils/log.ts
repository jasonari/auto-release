import chalk from 'chalk'
import { SCRIPT_NAME } from '../config/constants.js'

const isDryRun = process.argv.includes('--dry-run')
const scriptNameWithStyle = isDryRun
  ? chalk.bold.cyan(`[${SCRIPT_NAME}]`) + chalk.dim(' (dry run)')
  : chalk.bold.cyan(`[${SCRIPT_NAME}]`)

const info = (message: string) =>
  console.log(`${scriptNameWithStyle} ${message}`)
const success = (message: string) =>
  console.log(`${scriptNameWithStyle} ✨ ${chalk.green(message)}`)
const warn = (message: string) =>
  console.log(`${scriptNameWithStyle} ⚠️ ${chalk.yellow(message)}`)
const error = (message: string) =>
  console.error(`${scriptNameWithStyle} ❌ ${chalk.red(message)}`)

export default {
  info,
  warn,
  success,
  error
}
