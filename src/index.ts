import { docopt } from 'docopt'
import { sync } from './sync'
import { drop } from './drop'
import { Shell } from './routines/shells'
import { severe } from './tty'
import { loadConfig, JSONDatabase, CHECKOUT_FILE, BURN_FILE } from './files'
import { destroy } from './destroy';

const doc = `
Minami 1.0

Usage: minami sync [-t=<template_id>] <id> [<destination>]
       minami drop <id>
       minami destroy <id>

Options:
  -h --help      Print usage information
  -v --version   Print application version
`

const args = docopt(doc, { version: 'Minami 1.0' })
type Handler = (sh: Shell, checkouts: JSONDatabase, burns: JSONDatabase) => Promise<number>
let handler: Handler = async () => {
  console.log(doc)
  return 0
}

if (args.sync) {
  handler = (sh, checkouts, burns) => sync(sh, checkouts, burns, args['<id>'], args['<destination>'], args['<template_id>'])
} else if (args.drop) {
  handler = (sh, checkouts, burns) => drop(sh, checkouts, burns, args['<id>'])
} else if (args.destroy) {
  handler = (sh, checkouts, burns) => destroy(sh, checkouts, burns, args['<id>'])
}

;(async () => {
  let config = await loadConfig()
  let sh = new Shell(config)
  let checkouts = await JSONDatabase.load(CHECKOUT_FILE)
  let burns = await JSONDatabase.load(BURN_FILE)
  process.exit(await handler(sh, checkouts, burns))
})().catch(err => {
  severe(`Operation failed due to ${err}`)
  if (err.stack) {
    console.log(err.stack)
  }
})
