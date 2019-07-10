import { docopt } from 'docopt'
import { sync } from './sync'
import { drop } from './drop'
import { Shell } from './shell'
import { severe } from './tty'
import { loadConfig, CheckoutDatabase } from './files'
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
type Handler = (sh: Shell, checkouts: CheckoutDatabase) => Promise<number>
let handler: Handler = async () => {
  console.log(doc)
  return 0
}

if (args.sync) {
  handler = (sh, checkouts) => sync(sh, checkouts, args['<id>'], args['<destination>'], args['<template_id>'])
} else if (args.drop) {
  handler = (sh, checkouts) => drop(sh, checkouts, args['<id>'])
} else if (args.destroy) {
  handler = (sh, checkouts) => destroy(sh, checkouts, args['<id>'])
}

;(async () => {
  let config = await loadConfig()
  let sh = new Shell(config)
  let checkouts = await CheckoutDatabase.load()
  process.exit(await handler(sh, checkouts))
})().catch(err => {
  severe(`Operation failed due to ${err}`)
  if (err.stack) {
    console.log(err.stack)
  }
})
