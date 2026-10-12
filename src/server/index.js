import {
  applyJsonPatch, applyMutation, isRecord, mutationPatch, patchStateOperations,
  projectCurrentWorld, requiredString, upgradeLegacyWorld, validateWorldRoot,
} from '../world-state.js'

const componentSchemas = {
  world: { type: 'object', properties: { currentSceneId: { type: 'string', minLength: 1 } }, additionalProperties: false },
  place: { type: 'object', properties: {
    name: { type: 'string', minLength: 1 }, description: { type: 'string' }, parentPlaceId: { type: 'string', minLength: 1 },
    connections: { type: 'array' }, position: { type: 'object' }, facts: { type: 'object' }, resources: { type: 'array' },
  }, additionalProperties: false },
  scene: { type: 'object', properties: {
    name: { type: 'string', minLength: 1 }, description: { type: 'string' }, placeId: { type: 'string', minLength: 1 },
    participantEntityIds: { type: 'array', items: { type: 'string' } }, resources: { type: 'array' },
  }, additionalProperties: false },
  worldTime: { type: 'object', properties: {
    value: { type: 'object' }, timeZone: { type: 'string' }, paused: { type: 'boolean' },
  }, additionalProperties: false },
  calendar: { type: 'object', properties: {
    id: { type: 'string' }, name: { type: 'string' }, months: { type: 'array' }, weekdays: { type: 'array' },
    weekStartsOn: { type: 'integer' }, eras: { type: 'array' },
  }, additionalProperties: false },
  weather: { type: 'object', properties: {
    kind: { enum: ['clear', 'rain', 'snow', 'storm', 'fog', 'custom'] }, label: { type: 'string' },
    intensity: { type: 'number', minimum: 0, maximum: 1 }, startedAt: { type: 'string' },
  }, additionalProperties: false },
  background: { type: 'object', properties: {
    id: { type: 'string' }, asset: { type: 'object' }, name: { type: 'string' }, description: { type: 'string' },
    source: { type: 'string' }, availability: { type: 'object' },
  }, additionalProperties: false },
}

export function activate(context) {
  context.state.contribute({
    id: 'official.the-world.state',
    entityTypes: [{ id: 'official-the-world-entity', collectionPath: 'theWorld.entities', label: 'The World 实体' }],
    templates: Object.entries(componentSchemas).map(([componentKey, schema]) => ({
      id: `official.the-world.${componentKey}`, templateVersion: 1, componentKey,
      targetEntityTypeIds: ['official-the-world-entity'], schema, initial: {},
    })),
    entities: [{ typeId: 'official-the-world-entity', entityId: 'world' }],
    componentMounts: [{
      templateId: 'official.the-world.world', templateVersion: 1, componentKey: 'world',
      target: { kind: 'entity', entity: { typeId: 'official-the-world-entity', entityId: 'world' } },
    }],
    bindings: [],
  })

  const read = async (target, entityId, component) => {
    const snapshot = await context.state.read(target)
    const root = readWorldRoot(snapshot.value)
    const result = { target: snapshot.target, revisionId: snapshot.revisionId, createdAt: snapshot.createdAt, state: { theWorld: root } }
    if (entityId === undefined) {
      const current = projectCurrentWorld(root)
      return { ...result, current: { worldId: 'world', sceneId: current.scene?.id ?? null, placeId: current.place?.id ?? null } }
    }
    const entity = Object.hasOwn(root.entities, entityId) ? root.entities[entityId] : null
    return component === undefined ? { ...result, entityId, entity } : {
      ...result, entityId, component,
      value: entity && Object.hasOwn(entity.components, component) ? entity.components[component] : null,
    }
  }

  const write = async (target, expectedRevisionId, key, patch, signal) => {
    const operations = patchStateOperations(patch)
    signal?.throwIfAborted()
    const snapshot = await context.state.read(target)
    // A stale request can only replay an identical committed request or fail in the State Service.
    if (snapshot.revisionId === expectedRevisionId) applyJsonPatch(readWorldRoot(snapshot.value), patch)
    signal?.throwIfAborted()
    const result = await context.state.write({
      target, expectedRevisionId,
      idempotencyKey: JSON.stringify(['official.the-world', target.timelineId, target.branchId, key]),
      operations,
    })
    return { revisionId: result.snapshot.revisionId, changesetId: result.changesetId, state: { theWorld: readWorldRoot(result.snapshot.value) } }
  }

  context.rpc.register('official.the-world.readWorldState', async params => {
    const target = readTarget(params)
    const entityId = params.entityId === undefined ? undefined : requiredString(params.entityId, 'entityId')
    const component = params.component === undefined ? undefined : requiredString(params.component, 'component')
    return context.timeline.run(target, () => read(target, entityId, component))
  })
  context.rpc.register('official.the-world.writeWorldState', async params => {
    const target = readTarget(params)
    const mutation = params.mutation
    if (!isRecord(mutation) || !isRecord(mutation.target)
      || mutation.target.timelineId !== target.timelineId || mutation.target.branchId !== target.branchId) throw new Error('The World mutation branch does not match')
    return context.timeline.run(target, ({ signal }) => write(
      target, requiredString(mutation.expectedRevisionId, 'expectedRevisionId'),
      requiredString(mutation.idempotencyKey, 'idempotencyKey'), mutationPatch(mutation), signal,
    ))
  })
  context.agentTools.register('official.the-world/read-world-state', async (input, invocation) => {
    const target = toolTarget(input, invocation)
    invocation.signal.throwIfAborted()
    const entityId = input.arguments?.entityId
    return read(target, entityId === undefined ? undefined : requiredString(entityId, 'entityId'))
  })
  context.agentTools.register('official.the-world/update-world-state', async (input, invocation) => {
    const target = toolTarget(input, invocation)
    const args = input.arguments
    if (!isRecord(args)) throw new Error('The World update requires arguments')
    return write(target, requiredString(args.expectedRevisionId, 'expectedRevisionId'), requiredString(invocation.invocationId, 'invocationId'), args.patch, invocation.signal)
  })

  context.rpc.register('official.the-world.previewWorldUpgrade', async params => {
    const target = readTarget(params)
    return context.timeline.run(target, async () => {
      const snapshot = await context.state.read(target)
      const options = readUpgradeOptions(params)
      return { target, revisionId: snapshot.revisionId, state: upgradeLegacyWorld(snapshot.value?.theWorld, options), options }
    })
  })
  context.rpc.register('official.the-world.commitWorldUpgrade', async params => {
    const target = readTarget(params)
    const expectedRevisionId = requiredString(params.expectedRevisionId, 'expectedRevisionId')
    const key = requiredString(params.idempotencyKey, 'idempotencyKey')
    const state = validateWorldRoot(params.state)
    return context.timeline.run(target, async ({ signal }) => {
      const snapshot = await context.state.read(target)
      if (snapshot.revisionId === expectedRevisionId) {
        const expected = upgradeLegacyWorld(snapshot.value?.theWorld, readUpgradeOptions(params))
        if (JSON.stringify(expected) !== JSON.stringify(state)) throw new Error('The World upgrade preview does not match; preview again')
      }
      signal.throwIfAborted()
      const result = await context.state.write({
        target, expectedRevisionId,
        idempotencyKey: JSON.stringify(['official.the-world.upgrade', target.timelineId, target.branchId, key]),
        operations: [{ op: 'set', path: '/theWorld', value: state }],
      })
      return { revisionId: result.snapshot.revisionId, changesetId: result.changesetId, state: { theWorld: readWorldRoot(result.snapshot.value) } }
    })
  })
}

function readUpgradeOptions(params) {
  return {
    ...(params.worldEntityId === undefined ? {} : { worldEntityId: requiredString(params.worldEntityId, 'worldEntityId') }),
    ...(params.currentSceneId === undefined ? {} : { currentSceneId: requiredString(params.currentSceneId, 'currentSceneId') }),
  }
}

function toolTarget(input, invocation) {
  if (!invocation?.narrativeTarget || invocation.narrativeTarget.scope !== 'timeline') throw new Error('The World tool requires a bound Narrative Turn')
  if (input.arguments && ['timelineId', 'branchId', 'idempotencyKey', 'target'].some(key => Object.hasOwn(input.arguments, key))) throw new Error('The World tool target and invocation identity are supplied by the Host')
  return invocation.narrativeTarget
}

function readTarget(params) {
  if (!isRecord(params)) throw new Error('The World RPC requires a target')
  return { scope: 'timeline', timelineId: requiredString(params.timelineId, 'timelineId'), branchId: requiredString(params.branchId, 'branchId') }
}

function readWorldRoot(value) {
  if (!isRecord(value) || !isRecord(value.theWorld)) throw new Error('The World State is missing at this checkpoint; explicitly initialize it before use')
  return validateWorldRoot(value.theWorld)
}

export { applyJsonPatch, applyMutation, validateWorldRoot }
export default { activate }
