#!/usr/bin/env node

import updateVersion from './update-version.js'
import updateChangelog from './update-changelog.js'

export { updateVersion, updateChangelog }

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]

  switch (command) {
    case 'version':
      updateVersion()
      break
    case 'changelog':
      updateChangelog()
      break
    default:
      console.log('Usage: npx @jasonari/release <version|changelog>')
  }
}
