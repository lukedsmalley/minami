import { spawn } from 'child_process'
import { Configuration } from './files'
import { debug } from './tty'

export class Shell {
  private shellPath: string
  public remoteHost: string

  constructor(config: Configuration) {
    this.shellPath = config.shell
    this.remoteHost = config.host
  }

  here(command: string, ...args: any[]): Promise<string> {
    args = args.map(String)
    return new Promise((resolve, reject) => {
      debug([command, ...args.map(arg => arg.indexOf(' ') >= 0 ? `'${arg}'` : arg)].join(' '))
      let subprocess = spawn(command, args, { shell: this.shellPath })
      let output = ''
      subprocess.stdout.on('data', data => {
        output += data
        process.stdout.write(data)
      })
      subprocess.stderr.on('data', data => {
        output += data
        process.stderr.write(data)
      })
      subprocess.once('close', code => {
        if (code !== 0) {
          reject(`CommandError: Exited with status code ${code}`)
        } else {
          resolve(output)
        }
      })
    })
  }

  async succeedsHere(command: string, ...args: any[]) {
    try {
      await this.here(command, ...args)
      return true
    } catch {
      return false
    }
  }

  remote(command: string) {
    return this.here('ssh', '-i', '~/.minami-user/id.pem', this.remoteHost, command)
  }

  succeedsOnRemote(command: string) {
    return this.succeedsHere('ssh', '-i', '~/.minami-user/id.pem', this.remoteHost, command)
  }
}
