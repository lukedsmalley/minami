import { Configuration, exec, isNonEmptyDirectory, info, sshSucceeds, execSucceeds, warn, isValidObjectDirectory, isCopySafe, MINAMI_DEFAULT_TEMPLATE_DIR } from './common'
import { copy, writeJSON, move } from 'fs-extra'
import { resolve, parse } from 'path'
import { homedir } from 'os'
import { performance } from 'perf_hooks'

export async function sync(config: Configuration, checkouts: Record<string, string>, id: string, destination?: string, templatePath?: string) {
  if (checkouts[id] && !await isNonEmptyDirectory(checkouts[id])) {
    info('The previous checkout directory no longer exists')
    delete checkouts[id]
  }

  if (destination) {
    destination = resolve(destination)
    if (parse(destination).base !== id) {
      destination = resolve(destination, id)
    }
  }

  if (checkouts[id]) {
    if (destination && destination !== checkouts[id]) {
      if (await isNonEmptyDirectory(destination)) {
        warn(`The object is checked out into '${checkouts[id]}', ` + 
            `but the requested sync destination is non-empty directory '${destination}'. ` +
            'You need to manually merge the contents of these two directories.')
        return 1
      } else {
        info('A destination different from the existing checkout directory was given; moving files to new location')
        await move(checkouts[id], destination)
        checkouts[id] = destination
        await writeJSON(resolve(homedir(), '.minami-user', 'checkouts.json'), checkouts)
      }
    } else {
      destination = checkouts[id]
    }
  } else if (destination) {
    checkouts[id] = destination
    await writeJSON(resolve(homedir(), '.minami-user', 'checkouts.json'), checkouts)
  } else {
    const cwd = resolve(process.cwd())
    const cwdBase = parse(cwd).base
    checkouts[id] = destination = cwdBase === id ? cwdBase : resolve(cwd, id)
    await writeJSON(resolve(homedir(), '.minami-user', 'checkouts.json'), checkouts)
  }
  info(`Checkout directory is ${destination}`)

  info('Looking up local and remote objects')
  const remoteObjectExists = await sshSucceeds(config, `git --gir-dir=~/.minami-user/objects/${id} merge HEAD`)
  const localObjectPath = resolve(homedir(), '.minami-user', 'objects', id)
  const localObjectExists = await isNonEmptyDirectory(localObjectPath)
  const destinationExists = await isNonEmptyDirectory(destination)

  if (localObjectExists) {
    if (!await execSucceeds('git', [`--git-dir=${localObjectPath}`, 'merge', 'HEAD'])) {
      warn('Changes from the remote system are still in the process of being merged into your ' +
           'checked-out files. Finish resolving merge conflicts in the checked-out files and' +
           `then run 'minami accept ${id}'.`)
      return 1
    }

    if (!destinationExists) {
      warn('Checked out files were missing; recreating them from local history')
      exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'checkout'])
      return 0
    }
  } else if (remoteObjectExists) {
    if (destinationExists) {
      warn('Destination is a non-empty directory, but no object history was found. ' +
            'You need to clone the object into a separate directory and then manually ' +
            'merge the existing files into the object.')
      return 1
    } else {
      info('Cloning object from remote system')
      exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'clone', `ssh://${config.host}/~/.minami-user/objects/${id}`])
    }
  } else {
    info('No object found on remote system; creating object locally')
    exec('git', ['-C', localObjectPath, `--git-dir=.`, 'init'])
  }

  if (!await isValidObjectDirectory(destination)) {
    if (!templatePath) {
      templatePath = process.env.MINAMI_TEMPLATE_PATH
        ? resolve(process.env.MINAMI_TEMPLATE_PATH)
        : MINAMI_DEFAULT_TEMPLATE_DIR
    }

    if (!await isValidObjectDirectory(templatePath)) {
      warn(`The contents of directory '${templatePath}' do not constitute a valid object!`)
      return 1
    }

    if (await isCopySafe(templatePath, destination)) {
      info('Creating object from skeleton (and existing files, if any)')
      await copy(MINAMI_DEFAULT_TEMPLATE_DIR, destination)
    } else {
      warn('Directory cannot safely be turned into a valid object. It may be wise to ' +
           'create an object in a separate directory and manually merge your existing files.')
      return 1
    }
  }

  info('Adding changes to history')
  exec('git', ['-C', destination, `--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'add', '.'])
  execSucceeds('git', [`--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'commit', '-m', performance.now()])

  if (remoteObjectExists) {
    info('Pulling any new changes from remote system')
    exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'pull'])

    if (!await execSucceeds('git', [`--git-dir=${localObjectPath}`, 'merge', 'HEAD'])) {
      warn('Changes from the remote system must be merged with your local changes. ' +
           `Merge the marked changes in your checked-out files, and run 'minami accept ${id}'.`)
      return 0
    }

    info('Pushing history to remote system')
    exec('git', [`--git-dir=${localObjectPath}`, 'push'])
  } else {
    info('Copying object to remote system')
    exec('scp', ['-i', resolve(homedir(), '.minami-user', 'id.pem'), '-r', localObjectPath, `${config.host}:~/.minami-user/objects`])
  }

  return 0
}
