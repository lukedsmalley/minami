import { docopt } from 'docopt'
import { LocalShell, RemoteShell } from './shells'
import { severe, warn } from '../tty'
import { Context, Transaction } from './context'
import { push } from './push'
import { loadConfig } from './configuration'

const doc = `
Minami 1.0

Usage: minami push [<destination>]

Options:
  -h --help      Print usage information
  -v --version   Print application version
`

const args = docopt(doc, { version: '1.0' })
type Handler = (context: Context) => Promise<number>
let handler: Handler = async () => {
  console.log(doc)
  return 0
}

if (args.push) {
  handler = context => push(context, args['<destination>'] || process.cwd())
}

;(async () => {
  let config
  try {
    config = await loadConfig()
  } catch (err) {
    severe(`Failed to load config due to ${err}`)
    if (err.stack) {
      console.log(err.stack)
    }
    return process.exit(1)
  } 

  const sh = new LocalShell(config)
  const ssh = new RemoteShell(config)
  const transactions = new Set<Transaction>()

  try {
    const result = await handler({
      sh, ssh,

      commit(transaction) {
        transactions.add(transaction)
      }
    })

    for (let transaction of transactions) {
      try {
        await transaction.rollback()
      } catch (err) {
        warn(`A rollback failed due to ${err}`)
      }
    }
  } catch (err) {
    for (let transaction of transactions) {
      try {
        await transaction.rollback()
      } catch (err) {
        warn(`A rollback failed due to ${err}`)
      }
    }

    severe(`Operation failed due to ${err}`)
    if (err.stack) {
      console.log(err.stack)
    }
    process.exit(1)
  }
})
