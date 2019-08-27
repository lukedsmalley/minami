import { readFile } from 'fs-extra'

export async function laststat(id: string) {
  console.log(await readFile(`~/.minami/objects/${id}/stat.yml`, { encoding: 'utf8' }))
}

