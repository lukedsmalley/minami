import { mkdirs, resolve, inputYAML, ls, join } from '../common'
import { Context } from './context'
import { lstat } from 'fs-extra'
import minimatch from 'minimatch'

interface SetBallEvent {
  type: 'set-ball',
  ball: string
}

type Event = SetBallEvent

interface FileNode {
  size: number
}

interface ComputedFileNode extends FileNode {
  hash: string
}

interface DirectoryNode<T extends FileNode> {
  files: Record<string, T>
  directories: Record<string, DirectoryNode<T>>
}

async function buildFilteredDirectoryTree(path: string, exclusions: string[], previous?: string): Promise<DirectoryNode<ComputedFileNode>> {
  const files: Record<string, ComputedFileNode> = {}
  const directories: Record<string, DirectoryNode<ComputedFileNode>> = {}
  for (let name of await ls(path, previous)) {
    const subpath = join(previous, name)
    const filterMatches = exclusions.filter(exclusion =>
      minimatch(subpath, exclusion, { dot: true, nocomment: true }))
    if (filterMatches.length > 0 ) {
      continue
    }
    const resolvedSubpath = resolve(path, subpath)
    const stat = await fs.lstat(resolvedSubpath)
    if (stat.isDirectory()) {
      directories[name] = await buildFilteredDirectoryTree(path, exclusions, subpath)
    } else {
      files[name] = {
        size: stat.size,
        hash: await getFileSHA2(resolvedSubpath)
      }
    }
  }
  return { files, directories }
}

export async function push({ ssh }: Context, destination: string) {
  const objectFiles = (await ls(destination, '.minami/'))
    .filter(file => file.endsWith('.yml'))
  for (let objectFile of objectFiles) {
    
  }
  await mkdirs(destination, '.minami/history')
  await ssh.download(`~/.minami/${id}.yml`, resolve(destination, `.minami/${id}.yml`))
  const historyFile = resolve(destination, `.minami/history/${id}.yml`)
  await ssh.download(`~/.minami/history/${id}.yml`, historyFile)
  const history = await inputYAML<Event[]>(historyFile, [])
  let latestBall = null
  for (let event of history) {
    if (event.type === 'set-ball') {
      latestBall = event.ball
    }
  }
  if (latestBall === null) {
    throw Error('No balls')
  }
  await mkdirs(destination, '.minami/ball')
  await ssh.download(`~/.minami/ball/${latestBall}.tar.gz`, resolve(destination, `.minami/ball/${latestBall}.tar.gz`))
}
