import { LocalShell, RemoteShell } from './shells'

export interface Transaction {
  rollback(): Promise<void>
  finalize(): Promise<void>
}

export interface Context {
  readonly sh: LocalShell
  readonly ssh: RemoteShell
  commit(transaction: Transaction): void
}
