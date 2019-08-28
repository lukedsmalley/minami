import { LocalShell, RemoteShell } from "./shells";

export interface Context {
  sh: LocalShell,
  ssh: RemoteShell
}
