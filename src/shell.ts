import * as path from 'path'
import * as fs from 'fs-extra'
import { homedir } from 'os'
import { spawn } from 'child_process'
import chalk from 'chalk'
import { Configuration } from './common'

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

export class Shell {
  private shellPath: string
  private remoteHost: string

  private constructor(private config: Configuration) {
    this.shellPath = config.shell
    this.remoteHost = config.host
  }

  mv(source: string, target: string) {
    return fs.move(resolve(source), resolve(target))
  }

  cp(source: string, target: string) {
    return fs.copy(resolve(source), resolve(target))
  }

  rm(...parts: any[]) {
    return fs.remove(resolve(...parts))
  }

  ls(...parts: any[]) {
    return fs.readdir(resolve(...parts))
  }

  async isDirectory(...parts: any[]): Promise<boolean> {
    try {
      let cat = resolve(...parts)
      await fs.access(cat, fs.constants.F_OK)
      return (await fs.lstat(cat)).isDirectory()
    } catch {
      return false
    }
  }

  async isNonEmptyDirectory(...parts: any[]): Promise<boolean> {
    try {
      let cat = resolve(...parts)
      await fs.access(cat, fs.constants.F_OK)
      return (await fs.lstat(cat)).isDirectory() && (await fs.readdir(cat)).length > 0
    } catch {
      return false
    }
  }
  
  async isFile(...parts: any[]): Promise<boolean> {
    try {
      let cat = resolve(...parts)
      await fs.access(cat, fs.constants.F_OK)
      return (await fs.lstat(cat)).isFile()
    } catch {
      return false
    }
  }

  async inputJSON<T extends object>(source: string, defaults: T) {
    if (!await this.isFile(source)) {
      await this.outputJSON(source, defaults)
      return defaults
    } else {
      const data = fs.readJSON(resolve(source))
      return Object.assign({}, defaults, data) as T
    }
  }

  outputJSON(target: string, data: any) {
    return fs.outputJSON(resolve(target), data, { spaces: 2 })
  }

  exec(command: string, ...args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(chalk.gray([command, ...args.map(arg => arg.indexOf(' ') >= 0 ? `'${arg}'` : arg)].join(' ')))
      let subprocess = spawn(command, args, { shell: this.shellPath })
      let output = ''
      subprocess.stdout.on('data', data => {
        output += data
        process.stdout.write(data)
      })
      subprocess.stderr.on('data', data => {
        output += data
        process.stderr.write(data)
      })
      subprocess.once('close', code => {
        if (code !== 0) {
          reject(`CommandError: Exited with status code ${code}`)
        } else {
          resolve(output)
        }
      })
    })
  }

  async execSucceeds(command: string, ...args: string[]) {
    try {
      await this.exec(command, ...args)
      return true
    } catch {
      return false
    }
  }

  ssh(command: string) {
    return this.exec('ssh', '-i', '~/.minami-user/id.pem', this.remoteHost, command)
  }

  sshSucceeds(command: string) {
    return this.execSucceeds('ssh', '-i', '~/.minami-user/id.pem', this.remoteHost, command)
  }
}
