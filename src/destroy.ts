import { rm, isDirectory } from './common'
import { JSONDatabase } from './files'
import { Shell } from './routines/shells'

export async function destroy(sh: Shell, checkouts: JSONDatabase, burns: JSONDatabase, id: string) {
  if (await isDirectory('~/.minami-user/objects', id)) {
    await rm('~/.minami-user/objects', id)
  }

  if (checkouts.has(id)) {
    await rm(checkouts.get(id))
    await checkouts.delete(id)
  }

  await sh.remote(`rm -rf ~/.minami-user/objects/${id}`)

  return 0
}
