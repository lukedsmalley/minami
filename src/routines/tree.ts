import { glob, join, resolve, computeFileHash, lstat, base62 } from './fs'
import tar from 'tar'
import { createHash } from 'crypto'

interface FileNode {
  size: number
  hash: string
}

export interface DirectoryNode {
  files: Record<string, FileNode>
  directories: Record<string, DirectoryNode>
}

export async function buildTree(path: string, exclusions: string[], inclusions: string[], previousSubpath: string = ''): Promise<DirectoryNode> {
  const files: Record<string, FileNode> = {}
  const directories: Record<string, DirectoryNode> = {}
  
  for (let name of await glob(path, previousSubpath, exclusions, inclusions)) {
    const subpath = join(previousSubpath, name)
    const stat = await lstat(path, subpath)
    if (stat.isDirectory()) {
      directories[name] = await buildTree(path, exclusions, inclusions, subpath)
    } else {
      files[name] = {
        size: stat.size,
        hash: await computeFileHash(path, subpath)
      }
    }
  }

  return { files, directories }
}

export async function treeMatches(path: string, tree: DirectoryNode, exclusions: string[], inclusions: string[], previousSubpath: string = '') {
  const entries = await glob(path, previousSubpath, exclusions, inclusions)
  const directoryQueue = Object.keys(tree.directories)
  const fileQueue = Object.keys(tree.files)

  for (let name of entries) {
    const subpath = join(previousSubpath, name)
    const stat = await lstat(resolve(path, subpath))
    if (stat.isDirectory()) {
      if (!tree.directories[name] ||
          !await treeMatches(path, tree.directories[name], exclusions, inclusions, subpath)) {
        return false
      }
      directoryQueue.splice(directoryQueue.indexOf(name), 1)
    } else {
      if (!tree.files[name] ||
          tree.files[name].size !== stat.size || 
          tree.files[name].hash !== await computeFileHash(path, subpath)) {
        return false
      }
      fileQueue.splice(fileQueue.indexOf(name), 1)
    }
  }

  return !directoryQueue.length && !fileQueue.length
}

function getTreeFileList(tree: DirectoryNode) {
  const files = Object.keys(tree.files)
  for (let directory in tree.directories) {
    if (Object.keys(tree.directories[directory].files).length < 1) {
      files.push(directory)
    } else {
      files.push(...getTreeFileList(tree.directories[directory])
        .map(file => join(directory, file)))
    }
  }
  return files
}

export function computeHashFromTree(tree: DirectoryNode) {
  const hash = createHash('sha256')
  hash.update(getTreeFileList(tree).join(' '))
  return base62.encode(hash.digest())
}

export async function createBallFromTree(source: string, tree: DirectoryNode, destination: string) {
  await tar.create({
    gzip: true,
    file: destination,
    cwd: source
  }, getTreeFileList(tree))
}
