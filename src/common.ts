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
