import { Configuration, exec, isDirectory } from './common'
import { readdir } from 'fs-extra'
import { join } from 'path'
import { homedir } from 'os'

export async function pull(config: Configuration, id: string, destination?: string, create?: boolean) {
  if (!destination) {
    destination = process.cwd()
  }

  const localObjectPath = join(homedir(), '.minami', 'objects', id)

  if (await isDirectory(localObjectPath)) {
    exec('git', [`--git-dir='${localObjectPath}'`, '-C', destination, 'pull'])
  } else {
    
  }
  
  if (! await canRemotely$(config, `test -f '~/.minami-profile/data/${id}'`)) {
    if (await isDirectory(join(destination, '.git'))) {
      if (create) {
        await $('mv', join(destination, '.git'), join(destination, '.git-bak'))
      } else {
        throw 'Error: Destination contains alien Git data; Use --create to force pull'
      }
    }
    await remotely$(config, `mkdir -p '~/.minami-profile/data/${id}'`)
    await remotely$(config, `git -C '~/.minami-profile/data/${id}' init`)
  }
  if (await isDirectory(destination)) {
    if (await isDirectory(join(destination, '.git'))) {
      
    }
    if (create) {
      excludedFiles = await readdir(destination)
    } else {

    }
  }

}