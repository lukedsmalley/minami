import { ls, isFile } from "../common";

interface FileDescription {
  name: string
  size: number
  hash: string
}

interface DirectoryDescription {
  files: FileDescription[]
  directories: DirectoryDescription[]
}

export async function describe(...parts: any[]) {
  const files: FileDescription[] = []
  const directories: DirectoryDescription[] = []
  for (let name in await ls(...parts)) {
    if (await isFile(...parts, entry)) {
      files.push({
        name, size: 
      })
    }
  }
}
