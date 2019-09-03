import { inputYAML } from './serialization'

export interface Configuration {
  readonly shell: string
  readonly host: string
}

export const DEFAULT_CONFIGURATION: Configuration = {
  shell: '/bin/bash',
  host: 'unspecified'
}

export function loadConfig() {
  return inputYAML('~/.minami-user/config.yml', DEFAULT_CONFIGURATION)
}
