import { Configuration, exec, info, sshSucceeds, execSucceeds, warn, isValidObjectDirectory, isCopySafe, MINAMI_DEFAULT_TEMPLATE_DIR, ssh } from './common'
import { cp, mv, writeJSON, isNonEmptyDirectory, resolve, join } from './fs'
import { parse } from 'path'

export async function sync(config: Configuration, checkouts: Record<string, string>, id: string, destination?: string, templatePath?: string) {
  if (checkouts[id] && !await isNonEmptyDirectory(checkouts[id])) {
    info('The previous checkout directory no longer exists')
    delete checkouts[id]
  }

  if (destination) {
    if (parse(resolve(destination)).base !== id) {
      destination = join(destination, id)
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
        await mv(checkouts[id], destination)
        checkouts[id] = destination
        await writeJSON('~/.minami-user/checkouts.json', checkouts)
      }
    } else {
      destination = checkouts[id]
    }
  } else if (destination) {
    checkouts[id] = destination
    await writeJSON('~/.minami-user/checkouts.json', checkouts)
  } else {
    const cwdBase = parse(process.cwd()).base
    checkouts[id] = destination = cwdBase === id ? process.cwd() : join(process.cwd(), id)
    await writeJSON('~/.minami-user/checkouts.json', checkouts)
  }
  info(`Checkout directory is ${destination}`)

  info('Looking up local and remote objects')
  const remoteObjectExists = await sshSucceeds(config, `git --gir-dir=~/.minami-user/objects/${id} merge HEAD`)
  const localObjectPath = join('~/.minami-user/objects', id)
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
      await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'checkout'])
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
      await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'clone', `ssh://${config.host}/~/.minami-user/objects/${id}`])
    }
  } else {
    info('No object found on remote system; creating object locally')
    await exec('git', ['-C', localObjectPath, `--git-dir=.`, 'init'])
  }

  if (!await isValidObjectDirectory(destination)) {
    if (!templatePath) {
      templatePath = process.env.MINAMI_TEMPLATE_PATH || MINAMI_DEFAULT_TEMPLATE_DIR
    }

    if (!await isValidObjectDirectory(templatePath)) {
      warn(`The contents of directory '${templatePath}' do not constitute a valid object!`)
      return 1
    }

    if (await isCopySafe(templatePath, destination)) {
      info('Creating object from template directory (and existing files, if any)')
      await cp(MINAMI_DEFAULT_TEMPLATE_DIR, destination)
    } else {
      warn('Directory cannot safely be turned into a valid object. It may be wise to ' +
           'create an object in a separate directory and manually merge your existing files.')
      return 1
    }
  }

  info('Adding changes to history')
  await exec('git', ['-C', destination, `--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'add', '.'])
  await execSucceeds('git', [`--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'commit', '-m', Date.now()])

  if (remoteObjectExists) {
    info('Pulling any new changes from remote system')
    await exec('git', [`--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'pull'])

    if (!await execSucceeds('git', [`--git-dir=${localObjectPath}`, 'merge', 'HEAD'])) {
      warn('Changes from the remote system must be merged with your local changes. ' +
           `Merge the marked changes in your checked-out files, and run 'minami accept ${id}'.`)
      return 0
    }

    info('Pushing history to remote system')
    await exec('git', [`--git-dir=${localObjectPath}`, 'push'])
  } else {
    info('Copying object to remote system')
    await ssh(config, 'mkdir -p ~/.minami-user/objects')
    await exec('scp', ['-i', '~/.minami-user/id.pem', '-r', localObjectPath, `${config.host}:~/.minami-user/objects`])
  }

  return 0
}
