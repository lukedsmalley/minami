import { resolve, ls, isFile } from './fs'
import { Context } from './context'
import { parse } from 'path'
import { buildTree, createBallFromTree, computeHashFromTree, DirectoryNode, treeMatches } from './tree'
import { outputJSON, inputJSON } from './serialization'
import { loadObjectProperties } from './object';
import { updateObjectHistory } from './history';

export async function push({ ssh }: Context, destination: string) {
  const objects = (await ls(destination, '.minami'))
    .filter(file => file.endsWith('.yml'))
    .map(file => parse(file).base)
  for (let obj of objects) {
    const propertiesFile = resolve(destination, `.minami/${obj}.yml`)
    const treeFile = resolve(destination, `.minami/data/${obj}.tree.json`)
    const historyFile = resolve(destination, `.minami/data/${obj}.history.json`)
    const properties = await loadObjectProperties(propertiesFile)
    let tree
    if (await isFile(treeFile)) {
      tree = await inputJSON<DirectoryNode>(treeFile, { files: {}, directories: {} })
      if (!await treeMatches(destination, tree, properties.excludes || [], properties.includes || [])) {
        tree = await buildTree(destination, properties.excludes || [], properties.includes || [])
      }
    } else {
      tree = await buildTree(destination, properties.excludes || [], properties.includes || [])
    }
    const treeHash = computeHashFromTree(tree)
    const latestBallPath = resolve(destination, `.minami/data/${obj}.latest.tar.gz`)
    await createBallFromTree(destination, tree, latestBallPath)
    await outputJSON(treeFile, tree)
    await updateObjectHistory(historyFile, obj, properties, treeHash)
    await ssh.upload(propertiesFile, `~/.minami-user/${obj}.yml`)
    await ssh.upload(historyFile, `~/.minami-user/data/${obj}.history.json`)
    await ssh.upload(latestBallPath, `~/.minami-user/data/${obj}.${treeHash}.tar.gz`)
  }
}
