import { glob, join, resolve, lstat } from './fs'
import tar from 'tar'
import { computeHashFromFile, computeHash } from './hashing'

interface File {
  size: number
  hash: string
}

export interface DirectoryList {
  files: Record<string, File>
  directories: Record<string, DirectoryList>
}

export async function listDirectory(path: string, exclusions: string[], inclusions: string[], previousSubpath: string = ''): Promise<DirectoryList> {
  const files: Record<string, File> = {}
  const directories: Record<string, DirectoryList> = {}
  for (let name of await glob(path, previousSubpath, exclusions, inclusions)) {
    const subpath = join(previousSubpath, name)
    const stat = await lstat(path, subpath)
    if (stat.isDirectory()) {
      directories[name] = await listDirectory(path, exclusions, inclusions, subpath)
    } else {
      files[name] = {
        size: stat.size,
        hash: await computeHashFromFile(path, subpath)
      }
    }
  }
  return { files, directories }
}

export async function compareDirectoryList(path: string, list: DirectoryList, exclusions: string[], inclusions: string[], previousSubpath: string = '') {
  const entries = await glob(path, previousSubpath, exclusions, inclusions)
  const directoryQueue = Object.keys(list.directories)
  const fileQueue = Object.keys(list.files)
  for (let name of entries) {
    const subpath = join(previousSubpath, name)
    const stat = await lstat(resolve(path, subpath))
    if (stat.isDirectory()) {
      if (!list.directories[name] ||
          !await compareDirectoryList(path, list.directories[name], exclusions, inclusions, subpath)) {
        return false
      }
      directoryQueue.splice(directoryQueue.indexOf(name), 1)
    } else {
      if (!list.files[name] ||
          list.files[name].size !== stat.size || 
          list.files[name].hash !== await computeHashFromFile(path, subpath)) {
        return false
      }
      fileQueue.splice(fileQueue.indexOf(name), 1)
    }
  }
  return !directoryQueue.length && !fileQueue.length
}

function flattenDirectoryList(list: DirectoryList) {
  const files = Object.keys(list.files)
  for (let directory in list.directories) {
    if (Object.keys(list.directories[directory].files).length < 1) {
      files.push(directory)
    } else {
      files.push(...flattenDirectoryList(list.directories[directory])
        .map(file => join(directory, file)))
    }
  }
  return files
}

export function computeHashFromList(list: DirectoryList) {
  return computeHash(flattenDirectoryList(list).join(' '))
}

export async function createArchiveFromList(source: string, list: DirectoryList, destination: string) {
  await tar.create({
    gzip: true,
    file: destination,
    cwd: source
  }, flattenDirectoryList(list))
}
