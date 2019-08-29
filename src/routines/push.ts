import { mkdirs, resolve, inputYAML, ls, join } from '../common'
import { Context } from './context'
import glob from 'glob'
import { lstat } from 'fs-extra';

interface SetBallEvent {
  type: 'set-ball',
  ball: string
}

type Event = SetBallEvent

function getRegexFromGlob(glob: string) {
  return new RegExp(
    glob.split('**')
    .map(part => part.split('*').join('[^/]*'))
    .join('.*'))
}

async function walkFiltered(path: string, exclusions: string[], previous?: string) {
  const files = []
  const directories = []
  for (let name of await ls(path, previous)) {
    const stat = await lstat(resolve(join(path, previous), name))
    if (stat.isFile()) {
      files.push({ name, size: stat.size })
    } else {
      
    }
  }
}

export function walkIncluded(path: string, exclusions: string[]) {
  const pattern = exclusions.length > 1 ? `{${exclusions.join(',')}}` : exclusions[0]
  return new Promise((resolve, reject) => {
    glob(pattern, {
      cwd: path,
      root: path,
      dot: true
    }, (err, matches) => {
      if (err) {
        reject(err)
      } else {
        resolve(matches)
      }
    })
  })
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
