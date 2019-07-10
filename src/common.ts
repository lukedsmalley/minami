import * as fs from 'fs-extra'
import * as path from 'path'
import { homedir } from 'os'
import { debug } from './tty'
import { createHash } from 'crypto'

export function join(...parts: any[]) {
  if (parts.length < 1) {
    throw 'No path segments given'
  }
  let cat = String(parts[0])
  for (let i = 1; i < parts.length; i++) {
    if (!cat.endsWith('/')) {
      cat += '/'
    }
    let part = String(parts[i])
    cat += part.startsWith('/') ? part.substring(1) : part
  }
  return cat
}

export function resolve(...parts: any[]) {
  let cat = join(...parts)
  if (cat.startsWith('~/')) {
    return path.resolve(homedir(), cat.substring(2))
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

export function rm(...parts: any[]) {
  const cat = resolve(...parts)
  debug(`rm -r '${cat}'`)
  return fs.remove(cat)
}

export function mkdirs(...parts: any[]) {
  const cat = resolve(...parts)
  debug(`mkdir -p '${cat}'`)
  return fs.mkdirs(cat)
}

export function ls(...parts: any[]) {
  return fs.readdir(resolve(...parts))
}

export async function isDirectory(...parts: any[]): Promise<boolean> {
  try {
    let cat = resolve(...parts)
    await fs.access(cat, fs.constants.F_OK)
    return (await fs.lstat(cat)).isDirectory()
  } catch {
    return false
  }
}

export async function isNonEmptyDirectory(...parts: any[]): Promise<boolean> {
  try {
    let cat = resolve(...parts)
    await fs.access(cat, fs.constants.F_OK)
    return (await fs.lstat(cat)).isDirectory() && (await fs.readdir(cat)).length > 0
  } catch {
    return false
  }
}

export async function isFile(...parts: any[]): Promise<boolean> {
  try {
    let cat = resolve(...parts)
    await fs.access(cat, fs.constants.F_OK)
    return (await fs.lstat(cat)).isFile()
  } catch {
    return false
  }
}

export async function inputJSON<T extends object>(source: string, defaults: T) {
  if (!await isFile(source)) {
    await outputJSON(source, defaults)
    return defaults
  } else {
    const data = await fs.readJSON(resolve(source))
    return Object.assign({}, defaults, data) as T
  }
}

export function outputJSON(target: string, data: any) {
  return fs.outputJSON(resolve(target), data, { spaces: 2 })
}

async function getFileSize(...parts: any[]) {
  return (await fs.lstat(resolve(...parts))).size
}

function getFileSHA2(...parts: any[]) {
  const hash = createHash('sha512')
  const stream = fs.createReadStream(resolve(...parts))
  return new Promise((resolve, reject) => {
    stream.on('error', reject)
    stream.on('data', data => hash.update(data))
    stream.on('end', () => resolve(hash.digest('base64')))
  })
}

export async function isMergeSafe(source: string, target: string) {
  for (let entry of await ls(source)) {
    if (await isFile(source, entry)) {
      if (await isFile(target, entry)) {
        if (await getFileSize(target, entry) !== await getFileSize(source, entry) ||
            await getFileSHA2(target, entry) !== await getFileSHA2(source, entry)) {
          return false
        }
      }
    } else {
      if (await isNonEmptyDirectory(target, entry) &&
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
