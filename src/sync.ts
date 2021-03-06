import { parse } from 'path'
import { Shell } from './shell'
import { info, warn } from './tty'
import { join, resolve, isNonEmptyDirectory, mv, isValidObjectDirectory, isCopySafe, cp, mkdirs } from './common'
import { CheckoutDatabase } from './files'

export async function sync(sh: Shell, checkouts: CheckoutDatabase, id: string, destination?: string, template?: string): Promise<number> {
  if (checkouts.has(id) && !await isNonEmptyDirectory(checkouts.get(id))) {
    info('The previous checkout directory no longer exists')
    await checkouts.delete(id)
  }

  if (destination) {
    if (parse(resolve(destination)).base !== id) {
      destination = join(destination, id)
    }
  }

  if (checkouts.has(id)) {
    const checkoutPath = checkouts.get(id)
    if (destination && destination !== checkoutPath) {
      if (await isNonEmptyDirectory(destination)) {
        warn(`The object is checked out into '${checkoutPath}', ` + 
            `but the requested sync destination is non-empty directory '${destination}'. ` +
            'You need to manually merge the contents of these two directories.')
        return 1
      } else {
        info('A destination different from the existing checkout directory was given; moving files to new location')
        await mv(checkoutPath, destination)
        await checkouts.set(id, destination)
      }
    } else {
      destination = checkoutPath
    }
  } else if (destination) {
    await checkouts.set(id, destination)
  } else {
    const cwdBase = parse(process.cwd()).base
    destination = cwdBase === id ? process.cwd() : join(process.cwd(), id)
    await checkouts.set(id, destination)
  }
  info(`Checkout directory is ${destination}`)

  info('Looking up local and remote objects')
  const remoteObjectExists = await sh.succeedsOnRemote(`git --git-dir=~/.minami-user/objects/${id} merge HEAD`)
  const localObjectPath = join('~/.minami-user/objects', id)
  const localObjectExists = await isNonEmptyDirectory(localObjectPath)
  const destinationExists = await isNonEmptyDirectory(destination)

  if (localObjectExists) {
    if (!await sh.succeedsHere('git', `--git-dir=${localObjectPath}`, 'merge', 'HEAD')) {
      warn('Changes from the remote system are still in the process of being merged into your ' +
           'checked-out files. Finish resolving merge conflicts in the checked-out files and' +
           `then run 'minami accept ${id}'.`)
      return 1
    }

    if (!destinationExists) {
      warn('Checked out files were missing; recreating them from local history')
      await sh.here('git', `--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'checkout')
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
      await sh.here('git', `--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'clone', `ssh://${sh.remoteHost}/~/.minami-user/objects/${id}`)
    }
  } else {
    info('No object found on remote system; creating object locally')
    await mkdirs(localObjectPath)
    await sh.here('git', '-C', localObjectPath, `--git-dir=.`, 'init')
  }

  if (!await isValidObjectDirectory(destination)) {
    if (template) {
      info(`Synchronizing template object '${template}`)
      let templateSync = await sync(sh, checkouts, template, `~/.minami-user/templates/${id}`)
      if (templateSync !== 0) {
        return templateSync
      }
    }

    const templateID = template || '.default'
    const templatePath = join('~/.minami-user/templates', templateID)

    if (!await isValidObjectDirectory(templatePath)) {
      warn(`Object '${templateID}' does not constitute a valid template!`)
      return 1
    }

    if (await isCopySafe(templatePath, destination)) {
      info('Creating object from template directory (and existing files, if any)')
      await cp(templatePath, destination)
    } else {
      warn('Directory cannot safely be turned into a valid object. It may be wise to ' +
           'create an object in a separate directory and manually merge your existing files.')
      return 1
    }
  }

  info('Adding changes to history')
  await sh.here('git', '-C', destination, `--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'add', '.')
  await sh.succeedsHere('git', `--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'commit', '-m', Date.now().toString())

  if (remoteObjectExists) {
    info('Pulling any new changes from remote system')
    await sh.here('git', `--git-dir=${localObjectPath}`, `--work-tree=${destination}`, 'pull')

    if (!await sh.succeedsHere('git', `--git-dir=${localObjectPath}`, 'merge', 'HEAD')) {
      warn('Changes from the remote system must be merged with your local changes. ' +
           `Merge the marked changes in your checked-out files, and run 'minami accept ${id}'.`)
      return 0
    }

    info('Pushing history to remote system')
    await sh.here('git', `--git-dir=${localObjectPath}`, 'push')
  } else {
    info('Copying object to remote system')
    await sh.remote('mkdir -p ~/.minami-user/objects')
    await sh.here('scp', '-i', '~/.minami-user/id.pem', '-r', localObjectPath, `${sh.remoteHost}:~/.minami-user/objects`)
  }

  return 0
}
