import { mkdirs, resolve, inputYAML } from '../fs'
import { Context } from './context'

interface SetBallEvent {
  type: 'set-ball',
  ball: string
}

type Event = SetBallEvent

export async function clone({ ssh }: Context, id: string, destination: string) {
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
