import { inputJSON, outputJSON } from './common'

export const BURN_FILE = '~/.minami-user/burns.json',
             CHECKOUT_FILE = '~/.minami-user/checkouts.json'

export interface Configuration {
  readonly shell: string
  readonly host: string
}

export const DEFAULT_CONFIGURATION: Configuration = {
  shell: '/bin/bash',
  host: 'unspecified'
}

export function loadConfig() {
  return inputJSON('~/.minami-user/config.json', DEFAULT_CONFIGURATION)
}

export class JSONDatabase {
  private constructor(private entries: Record<string, string>,
                      private path: string) { }

  static load(path: string) {
    return inputJSON(path, {})
      .then(data => new JSONDatabase(data, path))
  }

  has(id: string) {
    return typeof this.entries[id] === 'string'
  }

  get(id: string) {
    if (!this.has(id)) {
      throw 'JSONDatabaseError: get(id) invoked without checking the result of has(id)'
    }
    return this.entries[id]
  }

  delete(id: string) {
    delete this.entries[id]
    return outputJSON(this.path, this.entries)
  }

  set(id: string, value: string) {
    this.entries[id] = value
    return outputJSON(id, this.entries)
  }
}
