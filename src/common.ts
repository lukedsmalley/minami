import { spawn } from 'child_process'
import chalk from 'chalk'
import { access, constants, lstat } from 'fs-extra'
import { homedir } from 'os'
import { join, sep } from 'path'

export interface Configuration {
  readonly host: string
}

function getCommandFromArgs(...params: any[]): [string, string[], object] {
  let path: string
  let args: string[] = []
  let env: object = {}

  for (let param of params) {
    if (param instanceof Array) args.push(...param.map(p => p.toString))
    else if (typeof param === 'object') Object.assign(env, param)
    else args.push(param.toString().split(' '))
  }

  path = args.shift()!

  return [path, args, env]
}

export function exec(...params: any[]): Promise<string> {
  let [path, args, env] = getCommandFromArgs(params)
  return new Promise((resolve, reject) => {
    console.log(chalk.gray([path, ...args].join(' ')))
    let subprocess = spawn(path, args, { env: Object.assign({}, process.env, env) })
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
        reject(code)
      } else {
        resolve(output)
      }
    })
  })
}

export function execSucceeds(...params: any[]): Promise<string | null> {
  let [path, args, env] = getCommandFromArgs(params)
  return new Promise((resolve, reject) => {
    console.log(chalk.gray([path, ...args].join(' ')))
    let subprocess = spawn(path, args, { env: Object.assign({}, process.env, env) })
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
        resolve(null)
      } else {
        resolve(output)
      }
    })
  })
}

export function ssh(config: Configuration, command: string) {
  return exec('ssh', '-i', join(homedir(), '.minami', 'id.pem'), config.host, command)
}

export function sshSucceeds(config: Configuration, command: string) {
  return execSucceeds('ssh', '-i', join(homedir(), '.minami', 'id.pem'), config.host, command)
}

export async function isDirectory(...pathParts: any[]): Promise<boolean> {
  try {
    let path = pathParts.map(p => p.toString()).join(sep)
    await access(path, constants.F_OK)
    return (await lstat(path)).isDirectory()
  } catch {
    return false
  }
}