import { resolve } from './fs'
import { inputJSON, outputJSON } from './serialization'
import { Properties } from './object'

interface SetPropertiesEvent {
  type: 'set-props'
  props: object
}

interface SetTreeReferenceEvent {
  type: 'set-tree-ref'
  hash: string
}

type Event = SetPropertiesEvent | SetTreeReferenceEvent

function getMostRecentEvent<T extends Event>(type: T['type'], history: Event[]) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === type) {
      return history[i] as T
    }
  }
  return null
}

function deeplyEqual(a: any, b: any) {
  if (a instanceof Array) {
    if (!(b instanceof Array) || b.length !== a.length) {
      return false
    }
    for (let i = a.length; --i >= 0;) {
      if (!deeplyEqual(a[i], b[i])) {
        return false
      }
    }
  } else if (typeof a === 'object') {
    if (((a === null) ? b !== null : (typeof b !== 'object' || b === null)) ||
        Object.keys(a).length !== Object.keys(b).length) {
      return false
    }
    for (let key in a) {
      if (!deeplyEqual(a[key], b[key])) {
        return false
      }
    }
  } else {
    return a === b
  }
  return true
}

export async function updateObjectHistory(destination: string, id: string, props: Properties, treeRef: string) {
  const propFilePath = resolve(destination, '.minami', id + '.yml')
  const history = await inputJSON<Event[]>(propFilePath, [])
  const additions: Event[] = []

  const mostRecentPropsUpdate = getMostRecentEvent<SetPropertiesEvent>('set-props', history)
  if (!mostRecentPropsUpdate ||
      !mostRecentPropsUpdate.props ||
      !deeplyEqual(mostRecentPropsUpdate.props, props)) {
    additions.push({ type: 'set-props', props })
  }

  const mostRecentTreeRefUpdate = getMostRecentEvent<SetTreeReferenceEvent>('set-tree-ref', history)
  if (!mostRecentTreeRefUpdate ||
      !mostRecentTreeRefUpdate.hash ||
      mostRecentTreeRefUpdate.hash !== treeRef) {
    additions.push({ type: 'set-tree-ref', hash: treeRef })
  }

  if (additions.length > 0) {
    history.push(...additions)
    await outputJSON(propFilePath, history)
  }
}
