import { spawn } from 'child_process'
import { Configuration } from './configuration'
import { debug } from '../tty'

class CommandResults {
  constructor(
    readonly exitCode: number,
    readonly succeeded: boolean,
    readonly outputBuffer: Buffer,
    readonly error: string,
    readonly log: string) { }

  static fromInvocation(shell: string, command: string, args: string[]): Promise<CommandResults> {
    const stringifiedArgs = args.map(String)
    return new Promise(resolve => {
      debug([command, ...stringifiedArgs.map(arg => arg.indexOf(' ') >= 0 ? `'${arg}'` : arg)].join(' '))
      const subprocess = spawn(command, stringifiedArgs, { shell })
      let outputBuffer = Buffer.alloc(0)
      let log = ''
      let error = ''
      subprocess.stdout.on('data', (data: Buffer) => {
        const previousBufferLength = outputBuffer.length
        outputBuffer = Buffer.from(outputBuffer, 0, previousBufferLength + data.length)
        data.copy(outputBuffer, previousBufferLength)
        log += data.toString('utf8')
        process.stdout.write(data)
      })
      subprocess.stderr.on('data', (data: Buffer) => {
        error += data.toString('utf8')
        log += data.toString('utf8')
        process.stderr.write(data)
      })
      subprocess.once('exit', code => {
        resolve(new CommandResults(code || 0, !code, outputBuffer, error, log))
      })
    })
  }

  output() {
    get: {
      return this.outputBuffer.toString('utf8')
    }
  }
}

export class LocalShell {
  constructor(protected config: Configuration) { }

  async e(command: string, ...args: any[]): Promise<CommandResults> {
    const results = await CommandResults.fromInvocation(this.config.shell, command, args)
    if (results.exitCode !== 0) {
      throw new Error(`Command '${command}' exited with code ${results.exitCode}`)
    }
    return results
  }

  c(command: string, ...args: any[]): Promise<CommandResults> {
    return CommandResults.fromInvocation(this.config.shell, command, args)
  }
}

export class RemoteShell extends LocalShell {
  async e(command: string) {
    return super.e('ssh', '-i', '~/.minami-user/id.pem', this.config.host, command)
  }

  c(command: string) {
    return super.c('ssh', '-i', '~/.minami-user/id.pem', this.config.host, command)
  }

  upload(source: string, target: string) {
    return super.c('scp', '-i', '~/.minami-user/id.pem', source, `${this.config.host}:${target}`)
  }

  download(source: string, target: string) {
    return super.c('scp', '-i', '~/.minami-user/id.pem', `${this.config.host}:${source}`, target)
  }
}
