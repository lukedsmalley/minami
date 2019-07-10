import { inputJSON, outputJSON } from './common'

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

export class CheckoutDatabase {
  private constructor(private checkouts: Record<string, string>) { }

  static load() {
    return inputJSON('~/.minami-user/checkouts.json', {})
      .then(data => new CheckoutDatabase(data))
  }

  has(id: string) {
    return typeof this.checkouts[id] === 'string'
  }

  get(id: string) {
    if (!this.has(id)) {
      throw 'CheckoutDatabaseError: get(id) invoked without checking the result of has(id)'
    }
    return this.checkouts[id]
  }

  delete(id: string) {
    delete this.checkouts[id]
    return outputJSON('~/.minami-user/checkouts.json', this.checkouts)
  }

  set(id: string, path: string) {
    this.checkouts[id] = path
    return outputJSON('~/.minami-user/checkouts.json', this.checkouts)
  }
}
