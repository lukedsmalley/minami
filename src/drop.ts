import { Configuration, isDirectory } from './common'
import { remove, writeJSON } from 'fs-extra'
import { join, resolve } from 'path'
import { homedir } from 'os'

export async function drop(config: Configuration, clones: Record<string, string>, id: string) {
  const localObjectPath = resolve(homedir(), '.minami-user', 'objects', id)

  if (await isDirectory(localObjectPath)) {
    await remove(localObjectPath)
  }

  if (clones[id]) {
    await remove(clones[id])
    delete clones[id]
  }

  await writeJSON(join(homedir(), '.minami-user', 'clones.json'), clones)

  return 0
}