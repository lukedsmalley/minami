import * as fs from 'fs-extra'
import { safeLoad, safeDump } from 'js-yaml'
import { isFile, resolve } from '../fs'

export async function inputJSON<T>(source: string, defaults: T) {
  if (!await isFile(source)) {
    await outputJSON(source, defaults)
    return defaults
  } else {
    const data = await fs.readFile(resolve(source), { encoding: 'utf8' })
    return Object.assign({}, defaults, data) as T
  }
}

export function outputJSON(target: string, data: any) {
  return fs.outputJSON(resolve(target), data)
}

export async function inputYAML<T>(source: string, defaults: T) {
  if (!await isFile(source)) {
    await outputYAML(source, defaults)
    return defaults
  } else {
    const data = safeLoad(await fs.readFile(resolve(source), { encoding: 'utf8' }))
    return Object.assign({}, defaults, data) as T
  }
}

export function outputYAML(target: string, data: any) {
  return fs.outputFile(resolve(target), safeDump(data))
}
