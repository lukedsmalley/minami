import { docopt } from 'docopt'
import { readJSON } from 'fs-extra'
import { homedir } from 'os'
import { join } from 'path'
import { sync } from './sync'
import { drop } from './drop'
import { Configuration } from './common'
import chalk from 'chalk'

const doc = `
Minami 1.0

Usage: minami sync <id> [<destination>]
       minami drop <id>

Options:
  -h --help      Print usage information
  -v --version   Print application version
`

const args = docopt(doc, { version: 'Minami 1.0' })
type Handler = (config: Configuration, checkouts: Record<string, string>) => Promise<number>
let handler: Handler = async (config, checkouts) => {
  console.log(doc)
  return 0
}

if (args.sync) {
  handler = (config, checkouts) => sync(config, checkouts, args['<id>'], args['<destination>'])
} else if (args.drop) {
  handler = (config, checkouts) => drop(config, checkouts, args['<id>'])
}

;(async () => {
  let config = await readJSON(join(homedir(), '.minami-user', 'config.json')) as Configuration
  if (typeof config.host !== 'string') {
    throw 'Error: No host specified in ~/.minami-user/config.json'
  }
  let checkouts = await readJSON(join(homedir(), '.minami-user', 'checkouts.json'))
  process.exit(await handler(config, checkouts))
})().catch(err => {
  console.log(chalk.redBright(`Operation failed due to ${err}`))
  if (err.stack) {
    console.log(err.stack)
  }
})
