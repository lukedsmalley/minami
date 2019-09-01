import { resolve } from './fs'
import { inputYAML } from './serialization'

export interface Properties {
  excludes?: string[]
  includes?: string[]
}

export async function loadObjectProperties(...path: string[]) {
  return await inputYAML<Properties>(resolve(...path), {})
}
