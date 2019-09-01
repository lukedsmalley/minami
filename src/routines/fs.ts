import * as fs from 'fs-extra'
import * as path from 'path'
import { homedir } from 'os'
import { debug } from '../tty'
import { createHash } from 'crypto'
import minimatch from 'minimatch'
import base_x from 'base-x'

export const base62 = base_x('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')

export function join(...parts: any[]) {
  const strings = parts
    .filter(part => part !== undefined)
    .map(String)
    .filter(part => part.length > 0)
  let cat = strings[0]
  for (let i = 1; i < strings.length; i++) {
    if (!cat.endsWith('/')) {
      cat += '/'
    }
    cat += strings[i].startsWith('/') ? strings[i].substring(1) : strings[i]
  }
  return cat.endsWith('/') ? cat.substring(0, cat.length - 1) : cat
}

export function resolve(...parts: any[]) {
  const cat = join(...parts)
  if (cat.startsWith('~')) {
    return path.resolve(homedir(), cat.substring(1))
  } else {
    return path.resolve(cat)
  }
}

export function mv(source: string, target: string) {
  debug(`mv '${source}' '${target}'`)
  return fs.move(resolve(source), resolve(target))
}

export function cp(source: string, target: string) {
  debug(`cp -r '${source}' '${target}'`)
  return fs.copy(resolve(source), resolve(target))
}

export function rm(...path: any[]) {
  const cat = resolve(...path)
  debug(`rm -r '${cat}'`)
  return fs.remove(cat)
}

export function mkdirs(...path: any[]) {
  const cat = resolve(...path)
  debug(`mkdir -p '${cat}'`)
  return fs.mkdirs(cat)
}

export function ls(...path: any[]) {
  return fs.readdir(resolve(...path))
}

export async function glob(root: string, path: string, exclusions: string[], inclusions: string[]) {
  const patterns = inclusions.length ? inclusions : exclusions
  return (await ls(root, path)).filter(entry =>
    patterns.filter(pattern => minimatch(join(path, entry), pattern, {
      dot: true,
      nocomment: true
    })).length ? inclusions.length : !inclusions.length)
}

export async function lstat(...path: any[]) {
  const cat = resolve(...path)
  await fs.access(cat, fs.constants.F_OK)
  return fs.lstat(resolve(...path))
}

export async function isDirectory(...path: any[]) {
  try {
    const cat = resolve(...path)
    await fs.access(cat, fs.constants.F_OK)
    return (await fs.lstat(cat)).isDirectory()
  } catch {
    return false
  }
}

export async function isDirectoryWithFiles(...path: any[]) {
  try {
    const cat = resolve(...path)
    await fs.access(cat, fs.constants.F_OK)
    return (await fs.lstat(cat)).isDirectory() && (await fs.readdir(cat)).length > 0
  } catch {
    return false
  }
}

export async function isFile(...path: any[]) {
  try {
    const cat = resolve(...path)
    await fs.access(cat, fs.constants.F_OK)
    return (await fs.lstat(cat)).isFile()
  } catch {
    return false
  }
}

export function computeFileHash(...path: any[]): Promise<string> {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(resolve(...path))
  return new Promise((resolve, reject) => {
    stream.on('error', reject)
    stream.on('data', data => hash.update(data))
    stream.on('end', () => resolve(base62.encode(hash.digest())))
  })
}

export async function isMergeSafe(source: string, target: string) {
  for (let entry of await ls(source)) {
    if (await isFile(source, entry)) {
      if (await isFile(target, entry)) {
        if (await getFileSize(target, entry) !== await getFileSize(source, entry) ||
            await computeFileHash(target, entry) !== await computeFileHash(source, entry)) {
          return false
        }
      }
    } else {
      if (await isDirectoryWithFiles(target, entry) &&
          !await isMergeSafe(join(source, entry), join(target, entry))) {
        return false
      }
    }
  }
  return true
}

export async function isValidObjectDirectory(...pathParts: any[]) {
  return await isFile(...pathParts, '.minami', 'object.yml')
}

export async function isCopySafe(source: string, destination: string) {
  for (let entry of await ls(source)) {
    if (await isFile(source, entry)) {
      if (await isFile(destination, entry)) {
        return false
      }
    } else if (await isDirectory(destination, entry)) {
      if (!await isCopySafe(join(source, entry), join(destination, entry))) {
        return false
      }
    }
  }
  return true
}
