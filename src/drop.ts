import { rm, isDirectory } from './common'
import { JSONDatabase } from './files'
import { Shell } from './routines/shells'

export async function drop(sh: Shell, checkouts: JSONDatabase, burns: JSONDatabase, id: string) {
  if (await isDirectory('~/.minami-user/objects', id)) {
    await rm('~/.minami-user/objects', id)
  }

  if (checkouts.has(id)) {
    await rm(checkouts.get(id))
    checkouts.delete(id)
  }

  return 0
}
