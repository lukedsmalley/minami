import { resolve, ls, isFile } from './fs'
import { Context } from './context'
import { parse } from 'path'
import { listDirectory, createArchiveFromList, DirectoryList, compareDirectoryList, computeHashFromList } from './listing'
import { outputJSON, inputJSON } from './serialization'
import { loadObjectProperties } from './object'
import { updateObjectHistory } from './history'

export async function push({ ssh }: Context, destination: string) {
  const objects = (await ls(destination, '.minami'))
    .filter(file => file.endsWith('.yml'))
    .map(file => parse(file).base)

  for (let obj of objects) {
    const treeFile = resolve(destination, `.minami/metadata/${obj}.tree.json`)
    const historyFile = resolve(destination, `.minami/metadata/${obj}.history.json`)
    
    const properties = await loadObjectProperties(destination, `.minami/${obj}.yml`)

    if (await isFile(treeFile)) {
      let tree = await inputJSON<DirectoryList>(treeFile, { files: {}, directories: {} })
      if (await compareDirectoryList(destination, tree, properties.excludes || [], properties.includes || [])) {
        await updateObjectHistory(historyFile, obj, properties)
        await ssh.upload(historyFile, `~/.minami-user/metadata/${obj}.history.json`)
      } else {
        const tree = await listDirectory(destination, properties.excludes || [], properties.includes || [])
        const treeHash = computeHashFromList(tree)
        const archivePath = resolve(destination, `.minami/archive/${treeHash}.tar.gz`)
        await createArchiveFromList(destination, tree, archivePath)
        await outputJSON(treeFile, tree)
        await updateObjectHistory(historyFile, obj, properties, treeHash)
        await ssh.upload(historyFile, `~/.minami-user/metadata/${obj}.history.json`)
        await ssh.upload(archivePath, `~/.minami-user/archive/${treeHash}.tar.gz`)
      }
    } else {
      const tree = await listDirectory(destination, properties.excludes || [], properties.includes || [])
      const treeHash = computeHashFromList(tree)
      const archivePath = resolve(destination, `.minami/archive/${treeHash}.tar.gz`)
      await createArchiveFromList(destination, tree, archivePath)
      await outputJSON(treeFile, tree)
      await updateObjectHistory(historyFile, obj, properties, treeHash)
      await ssh.upload(historyFile, `~/.minami-user/metadata/${obj}.history.json`)
      await ssh.upload(archivePath, `~/.minami-user/archive/${treeHash}.tar.gz`)
    }
  }
}
