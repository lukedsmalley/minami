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
type Handler = (config: Configuration, clones: Record<string, string>) => Promise<void>
let handler: Handler = async (config, clones) => console.log(doc)

if (args.sync) {
  handler = (config, clones) => sync(config, clones, args['<id>'], args['<destination>'])
} else if (args.drop) {
  handler = (config, clones) => drop(config, clones, args['<id>'])
}

;(async () => {
  let config = await readJSON(join(homedir(), '.minami', 'config.json')) as Configuration
  if (typeof config.host !== 'string') {
    throw 'Error: No host specified in ~/.minami/config.json'
  }
  let clones = await readJSON(join(homedir(), '.minami', 'clones.json'))
  await handler(config, clones)
})().catch(err => {
  console.log(chalk.redBright(`Operation failed due to ${err}`))
  if (err.stack) {
    console.log(err.stack)
  }
})
