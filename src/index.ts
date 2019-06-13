import { docopt } from 'docopt'
import { readJSON } from 'fs-extra'
import { homedir } from 'os'
import { join } from 'path'
import { pull } from './pull'
import { Configuration } from './common';

const doc = `
Minami 1.0

Usage: minami pull <id> <destination>

Options:
  -h --help      Print usage information
  -v --version   Print application version
`

const args = docopt(doc, { version: 'Minami 1.0' })
type Handler = (config: Configuration) => Promise<void>
let handler: Handler = async (config) => console.log(doc)

if (args.pull) {
  handler = config => pull(config, args['<id>'], args['<destination>'])
}

;(async () => {
  let config = await readJSON(join(homedir(), '.minami', 'config.json')) as Configuration
  if (typeof config.host !== 'string') {
    throw 'Error: No host specified in ~/.minami/config.json'
  }
  await handler(config)
})().catch(err => {
  console.log(`Operation failed due to ${err}\n${err.stack}`)
})
