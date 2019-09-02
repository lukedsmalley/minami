import base_x from 'base-x'
import { createHash } from 'crypto'
import { createReadStream } from 'fs-extra'
import { resolve } from './fs'

const base62 = base_x('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')

export function computeHash(data: Buffer | string) {
  return base62.encode(createHash('sha512').update(data).digest())
}

export function computeHashFromFile(...path: any[]): Promise<string> {
  const hash = createHash('sha512')
  const stream = createReadStream(resolve(...path))
  return new Promise((resolve, reject) => {
    stream.on('error', reject)
    stream.on('data', data => hash.update(data))
    stream.on('end', () => resolve(base62.encode(hash.digest())))
  })
}
