import { docopt } from 'docopt'
import { create } from './create'

const doc = `
Minami 1.0

Usage: minami (-h | --help | --version)
       minami create
`

const args = docopt(doc, { version: 'Minami 1.0' })
const handlers: Record<string, () => Promise<void>> = {
  create
}

handlers[Object.keys(handlers).filter(handler => args[handler])[0]]()
  .catch(err => console.log(`Operation failed due to ${err}\n${err.stack}`))
