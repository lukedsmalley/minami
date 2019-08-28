import { mkdirs, resolve, inputYAML, ls } from '../common'
import { Context } from './context'
import glob from 'glob'

interface SetBallEvent {
  type: 'set-ball',
  ball: string
}

type Event = SetBallEvent

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
