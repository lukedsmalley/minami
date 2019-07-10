import { rm, isDirectory } from './common'
import { CheckoutDatabase } from './files'
import { Shell } from './shell'

export async function drop(sh: Shell, checkouts: CheckoutDatabase, id: string) {
  if (await isDirectory('~/.minami-user/objects', id)) {
    await rm('~/.minami-user/objects', id)
  }

  if (checkouts.has(id)) {
    await rm(checkouts.get(id))
    checkouts.delete(id)
  }

  return 0
}
