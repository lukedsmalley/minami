import { spawn } from 'child_process'
import chalk from 'chalk'
import { createInterface } from 'readline'
import { isFile, join, isDirectory, ls } from './fs'

export const MINAMI_USER_DIR = '~/.minami-user',
             MINAMI_CONFIG_PATH = '~/.minami-user/config.json',
             MINAMI_CHECKOUT_INDEX_PATH = '~/.minami-user/checkouts.json',
             MINAMI_DEFAULT_TEMPLATE_DIR = '~/.minami-user/default_template'

export interface Configuration {
  readonly shell: string
  readonly host: string
}

export function info(...message: string[]) {
  console.log(chalk.cyanBright(...message))
}

export function warn(...message: string[]) {
  console.log(chalk.yellow(...message))
}

function getCommandFromArgs(...params: any[]): [string, string[], object] {
  let path: string
  let args: string[] = []
  let env: object = {}

  for (let param of params) {
    if (param instanceof Array) args.push(...param.map(p => p.toString()))
    else if (typeof param === 'object') Object.assign(env, param)
    else args.push(...param.toString().split(' '))
  }

  path = args.shift()!

  return [path, args, env]
}

export function exec(...params: any[]): Promise<string> {
  let [path, args, env] = getCommandFromArgs(...params)
  return new Promise((resolve, reject) => {
    console.log(chalk.gray([path, ...args.map(arg => arg.indexOf(' ') >= 0 ? `'${arg}'` : arg)].join(' ')))
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
        reject(`CommandError: Exited with status code ${code}`)
      } else {
        resolve(output)
      }
    })
  })
}

export function execSucceeds(...params: any[]): Promise<boolean> {
  let [path, args, env] = getCommandFromArgs(...params)
  return new Promise((resolve) => {
    console.log(chalk.gray([path, ...args].join(' ')))
    let subprocess = spawn(path, args, { env: Object.assign({}, process.env, env) })
    subprocess.once('close', code => {
      resolve(code === 0)
    })
  })
}

export function ssh(config: Configuration, command: string) {
  return exec('ssh', ['-i', '~/.minami-user/id.pem', config.host, command])
}

export function sshSucceeds(config: Configuration, command: string) {
  return execSucceeds('ssh', ['-i', '~/.minami-user/id.pem', config.host, command])
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

export function readOptional(prompt: string) {
  let reader = createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve => {
    reader.question(prompt + '[Y/n]', answer => {
      reader.close()
      resolve(answer === 'Y' || answer === 'y')
    })
  })
}

export function readLine(prompt: string) {
  let reader = createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve => {
    reader.question(prompt, answer => {
      reader.close()
      resolve(answer)
    })
  })
}
