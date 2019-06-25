import { Configuration, exec, isDirectory, log, sshSucceeds, ssh } from './common'
import { copy, remove, writeJSON, mkdirs } from 'fs-extra'
import { join, resolve, parse } from 'path'
import { homedir } from 'os'

export async function sync(config: Configuration, clones: Record<string, string>, id: string, destination?: string) {
  let workingDirectory
  if (destination) {
    destination = resolve(destination)
    if (parse(destination).base === id) {
      workingDirectory = destination
      destination = parse(destination).dir
    } else {
      workingDirectory = join(destination, id)
    }
  } else if (clones[id]) {
    destination = parse(clones[id]).dir
    workingDirectory = clones[id]
  } else {
    let cwd = resolve(process.cwd())
    if (parse(process.cwd()).base === id) {
      destination = parse(cwd).dir
      workingDirectory = cwd
    } else {
      destination = cwd
      workingDirectory = resolve(cwd, id)
    }
  }
  destination = destination
  workingDirectory = workingDirectory
  log(`Working directory: ${workingDirectory}`)
  log(`Destination: ${destination}`)

  if (clones[id] && clones[id] !== workingDirectory) {
    log('Already synced, but not to the given destination; copying existing files')
    await copy(clones[id], workingDirectory)
  }

  const localObjectCachePath = resolve(homedir(), '.minami', 'objects')
  const localObjectPath = resolve(homedir(), '.minami', 'objects', id)
  await mkdirs(localObjectCachePath)

  if (await sshSucceeds(config, `test -d ~/.minami/objects/${id}`)) {
    log('The object exists on the remote system')
    if (await isDirectory(localObjectPath)) {
      log('Syncronizing with the remote system')
      await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${workingDirectory}`, 'add', '.'])
      await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${workingDirectory}`, 'commit', '-m', 'update'])
      await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${workingDirectory}`, 'pull'])
      await exec('git', [`--git-dir=${localObjectPath}`, 'push'])
    } else {
      log('The object does not exist on this system; cloning object')
      await exec('git', [`--git-dir=${localObjectCachePath}`, `--work-tree=${workingDirectory}`, 'clone', `ssh://${config.host}/~/.minami/objects/${id}`])
    }
  } else {
    log('The object does not exist on the remote system')
    if (! await isDirectory(localObjectPath)) {
      log('The object does not exist on this system; creating object')
      await mkdirs(localObjectPath)
      await mkdirs(workingDirectory)
      await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${workingDirectory}`, 'init'])
      await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${workingDirectory}`, 'add', '.'])
      await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${workingDirectory}`, 'commit', '-m', 'update'])
    }
    log('Mirroring object on the remote system')
    await ssh(config, `mkdir -p ~/.minami/objects/${id}; git -C ~/.minami/objects/${id} --git-dir=. init`)
    await exec('git', [`--git-dir=${localObjectPath}`, 'push', '--mirror', `ssh://${config.host}/~/.minami/objects/${id}`])
  }

  if (clones[id] && clones[id] !== workingDirectory) {
    log('Removing files left over from the destination change')
    remove(clones[id])
    clones[id] = workingDirectory
  }

  log('Updating local object index')
  await writeJSON(join(homedir(), '.minami', 'clones.json'), clones)
}