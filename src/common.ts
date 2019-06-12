import { spawn } from 'child_process'

export function exec(...params: any[]) {
  let path: string
  let args: string[] = []
  let env: object = {}

  for (let param of params) {
    if (param instanceof Array) args.push(...param.map(p => p.toString))
    else if (typeof param === 'object') Object.assign(env, param)
    else args.push(param.toString())
  }

  if (args.length < 1) throw 1
  path = args.shift()!

  return new Promise((resolve, reject) => {
    let subprocess = spawn(path, args, { env: Object.assign({}, process.env, env) })
    let stdoutBuffer: string
    let stderrBuffer: string

    subprocess.once('close', code => {
      
    })
  })
}