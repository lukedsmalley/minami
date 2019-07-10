import chalk from 'chalk'
import { createInterface } from 'readline'

export const MINAMI_USER_DIR = '~/.minami-user',
             MINAMI_CONFIG_PATH = '~/.minami-user/config.json',
             MINAMI_CHECKOUT_INDEX_PATH = '~/.minami-user/checkouts.json',
             MINAMI_DEFAULT_TEMPLATE_DIR = '~/.minami-user/default_template'

export function info(...message: string[]) {
  console.log(chalk.cyanBright(...message))
}

export function warn(...message: string[]) {
  console.log(chalk.yellow(...message))
}

export function severe(...message: string[]) {
  console.log(chalk.redBright(...message))
}

export function debug(...message: string[]) {
  console.log(chalk.gray(...message))
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
