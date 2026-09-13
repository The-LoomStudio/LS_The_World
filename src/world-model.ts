import type { PlaceComponent, WorldEntity, WorldMutation, WorldStateSnapshot, WorldTimeComponent } from './contracts.js'

export function validateWorldSnapshot(snapshot: WorldStateSnapshot): WorldStateSnapshot {
  if (snapshot.schemaVersion !== 1) throw new Error(`Unsupported The World schema: ${snapshot.schemaVersion}`)
  if (!snapshot.branch.timelineId || !snapshot.branch.branchId) throw new Error('World snapshot branch is incomplete')
  return snapshot
}

export function applyWorldMutation(snapshot: WorldStateSnapshot, mutation: WorldMutation, revisionId: string): WorldStateSnapshot {
  validateWorldSnapshot(snapshot)
  if (mutation.schemaVersion !== snapshot.schemaVersion) throw new Error('World mutation schema does not match snapshot')
  if (mutation.target.timelineId !== snapshot.branch.timelineId || mutation.target.branchId !== snapshot.branch.branchId) throw new Error('World mutation target does not match snapshot branch')
  if (mutation.expectedRevisionId !== revisionId) throw new Error('World revision conflict')
  const entities = { ...snapshot.entities }
  for (const operation of mutation.operations) {
    if (operation.op === 'upsert-entity') entities[operation.entity.id] = assertEntityBranch(operation.entity, snapshot.branch)
    else if (operation.op === 'remove-entity') delete entities[operation.entityId]
    else {
      const entity = entities[operation.entityId]
      if (!entity) throw new Error(`World entity not found: ${operation.entityId}`)
      if (operation.op === 'set-component') entities[operation.entityId] = { ...entity, components: { ...entity.components, [operation.component]: operation.value } }
      else {
        const components = { ...entity.components }
        delete components[operation.component]
        entities[operation.entityId] = { ...entity, components }
      }
    }
  }
  return { ...snapshot, entities }
}

export function findPlaces(snapshot: WorldStateSnapshot, parentPlaceId?: string): WorldEntity[] {
  return Object.values(validateWorldSnapshot(snapshot).entities).filter(entity => entity.kind === 'place' && entity.components.place && entity.components.place.parentPlaceId === parentPlaceId)
}

export function advanceWorldTime(component: WorldTimeComponent, minutes: number): WorldTimeComponent {
  if (!Number.isInteger(minutes)) throw new Error('World time advance must use integer minutes')
  const date = new Date(Date.UTC(component.value.year, component.value.month - 1, component.value.day, component.value.hour, component.value.minute, component.value.second ?? 0, component.value.millisecond ?? 0))
  date.setUTCMinutes(date.getUTCMinutes() + minutes)
  return { ...component, value: { ...component.value, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds(), millisecond: date.getUTCMilliseconds() } }
}

function assertEntityBranch(entity: WorldEntity, branch: WorldStateSnapshot['branch']): WorldEntity {
  if (entity.branch.timelineId !== branch.timelineId || entity.branch.branchId !== branch.branchId) throw new Error(`World entity branch mismatch: ${entity.id}`)
  return entity
}

export function applyWorldJsonPatch(snapshot: WorldStateSnapshot, patch: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>): WorldStateSnapshot {
  const next = structuredClone(validateWorldSnapshot(snapshot))
  for (const operation of patch) {
    if (!operation.path.startsWith('/entities/')) throw new Error('The World JSON Patch path must stay under /entities')
    const parts = operation.path.split('/').slice(1).map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    let target: Record<string, any> = next as any
    for (const part of parts.slice(0, -1)) {
      if (!target[part] || typeof target[part] !== 'object') {
        if (operation.op !== 'add') throw new Error(`JSON Patch path does not exist: ${operation.path}`)
        target[part] = {}
      }
      target = target[part]
    }
    const key = parts.at(-1)
    if (!key) throw new Error('JSON Patch path is incomplete')
    if (operation.op === 'remove') { if (!(key in target)) throw new Error(`JSON Patch path does not exist: ${operation.path}`); delete target[key] }
    else { if (operation.op === 'replace' && !(key in target)) throw new Error(`JSON Patch replace path does not exist: ${operation.path}`); target[key] = operation.value }
  }
  return next
}
