import * as path from 'path'
import * as fs from 'fs-extra'
import { homedir } from 'os'
import { Configuration } from './common'

export class Shell {
  private shellPath: string
  private remoteHost: string

  private constructor(private config: Configuration) {
    this.shellPath = config.shell
    this.remoteHost = config.host
  }

  
}

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

export function readJSON(source: string) {
  return fs.readJSON(resolve(source))
}

export function writeJSON(target: string, data: any) {
  return fs.writeJSON(resolve(target), data, { spaces: 2 })
}

export function mv(source: string, target: string) {
  return fs.move(resolve(source), resolve(target))
}

export function cp(source: string, target: string) {
  return fs.copy(resolve(source), resolve(target))
}

export function rm(...parts: any[]) {
  return fs.remove(resolve(...parts))
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