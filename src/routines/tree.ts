import { lstat } from 'fs-extra'
import { ls, join, resolve, getFileSHA2 } from '../common'
import minimatch from 'minimatch'

async function lsFiltered(root: string, subpath: string | undefined, exclusions: string[], inclusions: string[]) {
  const patterns = inclusions.length ? inclusions : exclusions
  return (await ls(root, subpath)).filter(entry =>
    patterns.filter(pattern => minimatch(entry, pattern, {
      dot: true,
      nocomment: true
    })).length ? inclusions.length : !inclusions.length)
}

interface FileNode {
  size: number
}

interface ComputedFileNode extends FileNode {
  hash: string
}

interface DirectoryNode<T extends FileNode> {
  files: Record<string, T>
  directories: Record<string, DirectoryNode<T>>
}

async function buildTree(root: string, exclusions: string[], inclusions: string[], previousSubpath?: string): Promise<DirectoryNode<ComputedFileNode>> {
  const files: Record<string, ComputedFileNode> = {}
  const directories: Record<string, DirectoryNode<ComputedFileNode>> = {}
  
  for (let name of await lsFiltered(root, previousSubpath, exclusions, inclusions)) {
    const subpath = join(previousSubpath, name)
    const stat = await lstat(resolve(root, subpath))
    if (stat.isDirectory()) {
      directories[name] = await buildTree(root, exclusions, inclusions, subpath)
    } else {
      files[name] = {
        size: stat.size,
        hash: await getFileSHA2(root, subpath)
      }
    }
  }

  return { files, directories }
}

async function treeMatches(root: string, tree: DirectoryNode<ComputedFileNode>, exclusions: string[], inclusions: string[], previousSubpath?: string) {
  const entries = await lsFiltered(root, previousSubpath, exclusions, inclusions)
  const directoryQueue = Object.keys(tree.directories)
  const fileQueue = Object.keys(tree.files)

  for (let name of entries) {
    const subpath = join(previousSubpath, name)
    const stat = await lstat(resolve(root, subpath))
    if (stat.isDirectory()) {
      if (!tree.directories[name] ||
          !await treeMatches(root, tree.directories[name], exclusions, inclusions, subpath)) {
        return false
      }
      directoryQueue.splice(directoryQueue.indexOf(name), 1)
    } else {
      if (!tree.files[name] ||
          tree.files[name].size !== stat.size || 
          tree.files[name].hash !== await getFileSHA2(root, subpath)) {
        return false
      }
      fileQueue.splice(fileQueue.indexOf(name), 1)
    }
  }

  return !directoryQueue.length && !fileQueue.length
}
