import { Configuration } from './common'
import { rm, writeJSON, isDirectory } from './fs'

export async function drop(config: Configuration, clones: Record<string, string>, id: string) {
  if (await isDirectory('~/.minami-user/objects', id)) {
    await rm('~/.minami-user/objects', id)
  }

  if (clones[id]) {
    await rm(clones[id])
    delete clones[id]
  }

  await writeJSON('~/.minami-user/clones.json', clones)

  return 0
}