const RPC_READ_WORLD_STATE = 'official.the-world.readWorldState'
const RPC_WRITE_WORLD_STATE = 'official.the-world.writeWorldState'
const COMPONENTS = new Set(['place', 'scene', 'worldTime', 'calendar', 'background', 'weather'])

/**
 * Register the read-only State surface for The World.
 *
 * The host owns State storage and branch isolation. This module only forwards
 * an explicit Timeline / Branch target through the public SDK facade.
 */
export function activate(context) {
  context.state.contribute({
    id: 'official.the-world.state',
    entityTypes: [
      { id: 'official.the-world.entity', collectionPath: 'theWorld.entities', label: 'The World 实体' },
    ],
    templates: [{
      id: 'official.the-world.root',
      templateVersion: 1,
      schema: { type: 'object' },
      initial: { schemaVersion: 1, entities: {} },
      componentKey: 'theWorld',
    }],
    entities: [],
    componentMounts: [],
    bindings: [{
      path: 'theWorld',
      templateId: 'official.the-world.root',
      templateVersion: 1,
      initial: { schemaVersion: 1, entities: {} },
    }],
  })
  context.agentTools.register('official.the-world/update-world-state', async input => {
    const args = input.arguments
    if (!args || typeof args.timelineId !== 'string' || typeof args.branchId !== 'string' || typeof args.expectedRevisionId !== 'string' || typeof args.idempotencyKey !== 'string' || !Array.isArray(args.patch)) throw new Error('The World update tool arguments are incomplete')
    const snapshot = await context.state.read({ scope: 'timeline', timelineId: args.timelineId, branchId: args.branchId })
    const current = readWorldRoot(snapshot.value)
    if (args.expectedRevisionId !== snapshot.revisionId) throw new Error('The World revision conflict')
    if (current.branch.timelineId !== args.timelineId || current.branch.branchId !== args.branchId) throw new Error('The World patch branch does not match')
    const next = applyJsonPatch(current, args.patch)
    return await context.state.write({
      target: { scope: 'timeline', timelineId: args.timelineId, branchId: args.branchId },
      expectedRevisionId: snapshot.revisionId,
      idempotencyKey: args.idempotencyKey,
      operations: [{ op: 'set', path: 'theWorld', value: next }],
    })
  })
  context.agentTools.register('official.the-world/read-world-state', async input => {
    const args = input.arguments
    if (!args || typeof args.timelineId !== 'string' || typeof args.branchId !== 'string') throw new Error('The World tool requires timelineId and branchId')
    const snapshot = await context.state.read({ scope: 'timeline', timelineId: args.timelineId, branchId: args.branchId })
    if (typeof args.entityId !== 'string') return { revisionId: snapshot.revisionId, state: snapshot.value }
    const root = isRecord(snapshot.value.theWorld) ? snapshot.value.theWorld : null
    const entities = root && isRecord(root.entities) ? root.entities : null
    return { revisionId: snapshot.revisionId, entityId: args.entityId, entity: entities && Object.hasOwn(entities, args.entityId) ? entities[args.entityId] : null }
  })
  context.rpc.register(RPC_READ_WORLD_STATE, async params => {
    const input = readInput(params)
    const snapshot = await context.state.read({
      scope: 'timeline',
      timelineId: input.timelineId,
      branchId: input.branchId,
    })

    const result = {
      target: snapshot.target,
      revisionId: snapshot.revisionId,
      createdAt: snapshot.createdAt,
      state: snapshot.value,
    }

    if (input.entityId === undefined) return result

    const root = isRecord(snapshot.value.theWorld) ? snapshot.value.theWorld : undefined
    const entities = root && isRecord(root.entities) ? root.entities : undefined
    const entity = entities && Object.hasOwn(entities, input.entityId) ? entities[input.entityId] : null
    if (input.component === undefined) return { ...result, entityId: input.entityId, entity }

    const components = isRecord(entity) && isRecord(entity.components) ? entity.components : undefined
    return {
      ...result,
      entityId: input.entityId,
      component: input.component,
      value: components && Object.hasOwn(components, input.component) ? components[input.component] : null,
    }
  })
  context.rpc.register(RPC_WRITE_WORLD_STATE, async params => {
    const input = readWriteInput(params)
    const snapshot = await context.state.read({ scope: 'timeline', timelineId: input.timelineId, branchId: input.branchId })
    const current = readWorldRoot(snapshot.value)
    const next = applyMutation(current, input.mutation, snapshot.revisionId)
    const result = await context.state.write({
      target: { scope: 'timeline', timelineId: input.timelineId, branchId: input.branchId },
      expectedRevisionId: snapshot.revisionId,
      idempotencyKey: input.mutation.idempotencyKey,
      operations: [{ op: 'set', path: 'theWorld', value: next }],
    })
    return { revisionId: result.snapshot.revisionId, changesetId: result.changesetId, state: result.snapshot.value }
  })
}

function readWorldRoot(value) {
  if (!isRecord(value) || !isRecord(value.theWorld)) throw new Error('The World State root is missing at path theWorld')
  return value.theWorld
}

function applyJsonPatch(snapshot, patch) {
  const next = structuredClone(snapshot)
  for (const operation of patch) {
    if (!isRecord(operation) || !['add', 'replace', 'remove'].includes(operation.op) || typeof operation.path !== 'string') throw new Error('The World JSON Patch operation is invalid')
    if (!operation.path.startsWith('/entities/') || operation.path.includes('..')) throw new Error('The World JSON Patch path must stay under /entities')
    const parts = operation.path.split('/').slice(1).map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    let target = next
    for (const part of parts.slice(0, -1)) { if (!isRecord(target[part])) { if (operation.op === 'add') target[part] = {}; else throw new Error(`The World JSON Patch path does not exist: ${operation.path}`) } target = target[part] }
    const key = parts.at(-1)
    if (!key) throw new Error('The World JSON Patch path is incomplete')
    if (operation.op === 'remove') { if (!Object.hasOwn(target, key)) throw new Error(`The World JSON Patch path does not exist: ${operation.path}`); delete target[key] }
    else { if (operation.op === 'replace' && !Object.hasOwn(target, key)) throw new Error(`The World JSON Patch replace path does not exist: ${operation.path}`); target[key] = operation.value }
  }
  return next
}

function applyMutation(snapshot, mutation, revisionId) {
  if (mutation.schemaVersion !== 1 || mutation.expectedRevisionId !== revisionId) throw new Error('The World mutation schema or revision does not match')
  if (mutation.target.timelineId !== snapshot.branch.timelineId || mutation.target.branchId !== snapshot.branch.branchId) throw new Error('The World mutation branch does not match')
  const entities = { ...snapshot.entities }
  for (const operation of mutation.operations) {
    if (operation.op === 'upsert-entity') entities[operation.entity.id] = operation.entity
    else if (operation.op === 'remove-entity') delete entities[operation.entityId]
    else {
      const entity = entities[operation.entityId]
      if (!entity) throw new Error(`The World entity was not found: ${operation.entityId}`)
      const components = { ...entity.components }
      if (operation.op === 'set-component') components[operation.component] = operation.value
      else delete components[operation.component]
      entities[operation.entityId] = { ...entity, components }
    }
  }
  return { ...snapshot, entities }
}

function readWriteInput(params) {
  if (!isRecord(params) || !isRecord(params.mutation)) throw new Error('The World writeWorldState params must contain mutation')
  const timelineId = requiredString(params.timelineId, 'timelineId')
  const branchId = requiredString(params.branchId, 'branchId')
  const mutation = params.mutation
  if (typeof mutation.expectedRevisionId !== 'string' || typeof mutation.idempotencyKey !== 'string' || !Array.isArray(mutation.operations)) {
    throw new Error('The World mutation requires expectedRevisionId, idempotencyKey and operations')
  }
  return { timelineId, branchId, mutation }
}

function readInput(params) {
  if (!isRecord(params)) throw new Error('The World readWorldState params must be an object')
  const timelineId = requiredString(params.timelineId, 'timelineId')
  const branchId = requiredString(params.branchId, 'branchId')
  const entityId = params.entityId === undefined ? undefined : requiredString(params.entityId, 'entityId')
  const component = params.component === undefined ? undefined : requiredString(params.component, 'component')
  if (component !== undefined && !COMPONENTS.has(component)) {
    throw new Error(`The World component is unsupported: ${component}`)
  }
  return { timelineId, branchId, entityId, component }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`The World ${field} must be a non-empty string`)
  return value.trim()
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default { activate }
