const COMPONENTS = new Set(['world', 'place', 'scene', 'worldTime', 'calendar', 'background', 'weather'])
const WEATHER_KINDS = new Set(['clear', 'rain', 'snow', 'storm', 'fog', 'custom'])
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function createWorldRoot() {
  return {
    entities: {
      world: { components: { world: {} } },
    },
  }
}

export function validateWorldRoot(root) {
  if (isRecord(root) && Object.hasOwn(root, 'schemaVersion')) throw new Error('The World legacy State requires preview and explicit upgrade before use')
  if (!isRecord(root) || !isRecord(root.entities) || Object.keys(root).some(key => key !== 'entities') || !isJsonValue(root)) throw new Error('The World State root is invalid')
  for (const [id, entity] of Object.entries(root.entities)) {
    if (!isRecord(entity) || !nonEmpty(id) || UNSAFE_KEYS.has(id) || !isRecord(entity.components)
      || Object.keys(entity).some(key => key !== 'components')) throw new Error(`The World entity must contain only components: ${id}`)
    for (const [component, value] of Object.entries(entity.components)) {
      if (!COMPONENTS.has(component)) throw new Error(`The World component is unsupported: ${component}`)
      validateComponent(component, value)
      if (component === 'world' && id !== 'world') throw new Error('The World current scene belongs to the fixed world entity')
    }
  }
  const world = root.entities.world
  if (!world || !world.components.world) throw new Error('The World fixed world entity is missing')
  const requireComponent = (id, component) => {
    if (!Object.hasOwn(root.entities, id) || !root.entities[id].components[component]) throw new Error(`The World ${component} reference is missing: ${id}`)
    return root.entities[id].components[component]
  }
  if (world.components.world.currentSceneId !== undefined) requireComponent(world.components.world.currentSceneId, 'scene')
  const calendars = new Map()
  for (const [id, entity] of Object.entries(root.entities)) {
    const calendar = entity.components.calendar
    if (calendar) {
      if (calendars.has(calendar.id)) throw new Error(`The World calendar id is duplicated: ${calendar.id}`)
      calendars.set(calendar.id, calendar)
    }
    const place = entity.components.place
    if (place?.parentPlaceId !== undefined) {
      const ancestors = new Set([id])
      let parent = place.parentPlaceId
      while (parent !== undefined) {
        if (ancestors.has(parent)) throw new Error(`The World place hierarchy is cyclic: ${id}`)
        ancestors.add(parent)
        parent = requireComponent(parent, 'place').parentPlaceId
      }
    }
    for (const connection of place?.connections ?? []) requireComponent(connection.toPlaceId, 'place')
    if (entity.components.scene?.placeId !== undefined) requireComponent(entity.components.scene.placeId, 'place')
  }
  for (const entity of Object.values(root.entities)) {
    const time = entity.components.worldTime?.value
    if (!time) continue
    const calendar = calendars.get(time.calendarId)
    if (!calendar) throw new Error(`The World calendar reference is missing: ${time.calendarId}`)
    const month = calendar.months[time.month - 1]
    if (!month || time.day > month.days) throw new Error('The World date is outside its calendar')
  }
  return root
}

function validateComponent(component, value) {
  if (!isRecord(value) || Object.hasOwn(value, 'version')) throw new Error(`The World component is invalid: ${component}`)
  if (component === 'world') {
    optionalString(value, 'currentSceneId')
  } else if (component === 'place' || component === 'scene') {
    if (!nonEmpty(value.name)) throw new Error(`The World ${component} name is required`)
    optionalString(value, 'description', true)
    if (value.resources !== undefined) {
      if (!Array.isArray(value.resources)) throw new Error('The World resources must be an array')
      value.resources.forEach(validateResource)
    }
    if (component === 'scene') {
      optionalString(value, 'placeId')
      if (value.participantEntityIds !== undefined && (!Array.isArray(value.participantEntityIds) || !value.participantEntityIds.every(nonEmpty))) throw new Error('The World participants are invalid')
    } else {
      optionalString(value, 'parentPlaceId')
      if (value.connections !== undefined && (!Array.isArray(value.connections) || value.connections.some(connection =>
        !isRecord(connection) || !nonEmpty(connection.toPlaceId) || !['adjacent', 'contains', 'exits', 'custom'].includes(connection.relation)
        || (connection.label !== undefined && typeof connection.label !== 'string')
        || (connection.bidirectional !== undefined && typeof connection.bidirectional !== 'boolean')
      ))) throw new Error('The World place connections are invalid')
      if (value.position !== undefined && (!isRecord(value.position) || !Number.isFinite(value.position.x) || !Number.isFinite(value.position.y)
        || (value.position.z !== undefined && !Number.isFinite(value.position.z))
        || (value.position.space !== undefined && typeof value.position.space !== 'string'))) throw new Error('The World place position is invalid')
      if (value.facts !== undefined && (!isRecord(value.facts) || Object.values(value.facts).some(fact => fact !== null && !['string', 'number', 'boolean'].includes(typeof fact)))) throw new Error('The World place facts are invalid')
    }
  } else if (component === 'worldTime') {
    const time = value.value
    if (!isRecord(time) || !nonEmpty(time.calendarId) || !Number.isInteger(time.year)
      || !Number.isInteger(time.month) || time.month < 1 || !Number.isInteger(time.day) || time.day < 1
      || !integerBetween(time.hour, 0, 23) || !integerBetween(time.minute, 0, 59)
      || (time.second !== undefined && !integerBetween(time.second, 0, 59))
      || (time.millisecond !== undefined && !integerBetween(time.millisecond, 0, 999))) throw new Error('The World time component is invalid')
    optionalString(value, 'timeZone')
    if (value.paused !== undefined && typeof value.paused !== 'boolean') throw new Error('The World time paused flag is invalid')
  } else if (component === 'calendar') {
    if (!nonEmpty(value.id) || !nonEmpty(value.name) || !Array.isArray(value.months) || !value.months.length
      || value.months.some(month => !isRecord(month) || !nonEmpty(month.id) || !nonEmpty(month.name) || !Number.isInteger(month.days) || month.days < 1)
      || new Set(value.months.map(month => month.id)).size !== value.months.length) throw new Error('The World calendar component is invalid')
    if (value.weekdays !== undefined && (!Array.isArray(value.weekdays) || !value.weekdays.length
      || value.weekdays.some(day => !isRecord(day) || !nonEmpty(day.id) || !nonEmpty(day.name))
      || new Set(value.weekdays.map(day => day.id)).size !== value.weekdays.length)) throw new Error('The World calendar weekdays are invalid')
    if (value.weekStartsOn !== undefined && (!value.weekdays || !integerBetween(value.weekStartsOn, 0, value.weekdays.length - 1))) throw new Error('The World week start is invalid')
    if (value.eras !== undefined && (!Array.isArray(value.eras) || value.eras.some(era => !isRecord(era) || !nonEmpty(era.id) || !nonEmpty(era.name) || !Number.isInteger(era.startsAtYear)))) throw new Error('The World calendar eras are invalid')
  } else if (component === 'weather') {
    if (!WEATHER_KINDS.has(value.kind) || (value.intensity !== undefined && (!Number.isFinite(value.intensity) || value.intensity < 0 || value.intensity > 1))) throw new Error('The World weather component is invalid')
    optionalString(value, 'label', true)
    optionalString(value, 'startedAt')
  } else if (component === 'background') {
    if (!nonEmpty(value.id) || !nonEmpty(value.name) || typeof value.description !== 'string' || !nonEmpty(value.source)) throw new Error('The World background component is invalid')
    validateResource(value.asset)
    if (value.asset.kind !== 'asset' || value.asset.role !== 'background') throw new Error('The World background must reference a background Asset')
    validateAvailability(value.availability)
  }
}

function validateResource(value) {
  if (!isRecord(value) || !nonEmpty(value.id) || !['asset', 'prompt-resource'].includes(value.kind)
    || !['image', 'audio', 'map', 'background', 'other'].includes(value.role)) throw new Error('The World resource reference is invalid')
  optionalString(value, 'label', true)
  validateAvailability(value.availability)
}

function validateAvailability(value) {
  if (!isRecord(value) || !['available', 'missing', 'revoked'].includes(value.status)) throw new Error('The World resource availability is invalid')
  if (value.status !== 'available' && !nonEmpty(value.observedAt)) throw new Error('The World unavailable resource requires an observation time')
  optionalString(value, 'reason', true)
}

export function applyJsonPatch(snapshot, patch) {
  validateWorldRoot(snapshot)
  const next = structuredClone(snapshot)
  for (const operation of parsePatch(patch)) {
    let target = next
    for (const part of operation.parts.slice(0, -1)) {
      if (!Object.hasOwn(target, part) || !isRecord(target[part])) throw new Error(`The World JSON Patch path must traverse existing objects: ${operation.path}`)
      target = target[part]
    }
    const key = operation.parts.at(-1)
    if (operation.op !== 'add' && !Object.hasOwn(target, key)) throw new Error(`The World JSON Patch path does not exist: ${operation.path}`)
    if (operation.op === 'remove') delete target[key]
    else target[key] = structuredClone(operation.value)
  }
  return validateWorldRoot(next)
}

export function patchStateOperations(patch) {
  return parsePatch(patch).map(operation => operation.op === 'remove'
    ? { op: 'remove', path: `/theWorld${operation.path}` }
    : { op: 'set', path: `/theWorld${operation.path}`, value: structuredClone(operation.value) })
}

function parsePatch(patch) {
  if (!Array.isArray(patch) || !patch.length) throw new Error('The World JSON Patch requires operations')
  return patch.map(operation => {
    if (!isRecord(operation) || !['add', 'replace', 'remove'].includes(operation.op) || typeof operation.path !== 'string') throw new Error('The World JSON Patch operation is invalid')
    if (!operation.path.startsWith('/entities/') || /~(?![01])/.test(operation.path)) throw new Error('The World JSON Patch path must stay under /entities')
    const parts = operation.path.split('/').slice(1).map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    if (parts.some(part => !part || UNSAFE_KEYS.has(part))) throw new Error('The World JSON Patch path is invalid')
    if (operation.op !== 'remove' && !isJsonValue(operation.value)) throw new Error('The World JSON Patch value must be JSON')
    return { ...operation, parts }
  })
}

export function mutationPatch(mutation) {
  if (!isRecord(mutation) || mutation.schemaVersion !== 3 || !Array.isArray(mutation.operations) || !mutation.operations.length) throw new Error('The World mutation is invalid')
  const pointer = value => requiredString(value, 'entity/component id').replaceAll('~', '~0').replaceAll('/', '~1')
  return mutation.operations.map(operation => {
    if (!isRecord(operation)) throw new Error('The World mutation operation is invalid')
    if (operation.op === 'upsert-entity') {
      if (!isRecord(operation.entity)) throw new Error('The World entity is invalid')
      return { op: 'add', path: `/entities/${pointer(operation.entityId)}`, value: operation.entity }
    }
    if (operation.op === 'remove-entity') return { op: 'remove', path: `/entities/${pointer(operation.entityId)}` }
    if (operation.op !== 'set-component' && operation.op !== 'remove-component') throw new Error('The World mutation operation is invalid')
    if (!COMPONENTS.has(operation.component)) throw new Error('The World component is unsupported')
    const path = `/entities/${pointer(operation.entityId)}/components/${pointer(operation.component)}`
    return operation.op === 'remove-component' ? { op: 'remove', path } : { op: 'add', path, value: operation.value }
  })
}

export function applyMutation(snapshot, mutation, revisionId, target) {
  if (mutation.expectedRevisionId !== revisionId) throw new Error('The World revision conflict')
  if (!isRecord(mutation.target) || mutation.target.timelineId !== target.timelineId || mutation.target.branchId !== target.branchId) throw new Error('The World mutation branch does not match')
  return applyJsonPatch(snapshot, mutationPatch(mutation))
}

export function projectCurrentWorld(snapshot) {
  validateWorldRoot(snapshot)
  const world = snapshot.entities.world
  const sceneId = world.components.world.currentSceneId
  const scene = sceneId === undefined ? undefined : snapshot.entities[sceneId]
  const placeId = scene?.components.scene?.placeId
  return {
    world: { id: 'world', ...world },
    scene: scene === undefined ? undefined : { id: sceneId, ...scene },
    place: placeId === undefined ? undefined : { id: placeId, ...snapshot.entities[placeId] },
    time: world.components.worldTime,
    weather: scene?.components.weather ?? world.components.weather,
    background: scene?.components.background ?? world.components.background,
  }
}

export function upgradeLegacyWorld(root, options = {}) {
  if (!isRecord(root) || ![1, 2].includes(root.schemaVersion) || !isRecord(root.entities)) throw new Error('The World upgrade requires a v1 or v2 root')
  const next = structuredClone(root)
  delete next.schemaVersion
  delete next.branch
  for (const entity of Object.values(next.entities)) {
    if (!isRecord(entity) || entity.schemaVersion !== root.schemaVersion || !isRecord(entity.components)) throw new Error('The World legacy entity is invalid')
    for (const key of ['schemaVersion', 'id', 'kind', 'createdBy', 'createdAt', 'updatedAt', 'branch']) delete entity[key]
    for (const component of Object.values(entity.components)) {
      if (isRecord(component)) {
        if (Object.hasOwn(component, 'version') && component.version !== 1) throw new Error('The World legacy component version is unsupported')
        delete component.version
      }
    }
  }
  const worldId = options.worldEntityId ?? 'world'
  if (worldId !== 'world') {
    if (UNSAFE_KEYS.has(worldId) || Object.hasOwn(next.entities, 'world') || !Object.hasOwn(next.entities, worldId)) throw new Error('The World upgrade world identity is ambiguous')
    next.entities.world = next.entities[worldId]
    delete next.entities[worldId]
    for (const entity of Object.values(next.entities)) {
      const components = entity.components
      if (!isRecord(components)) throw new Error('The World v1 components are invalid')
      if (components.place?.parentPlaceId === worldId) components.place.parentPlaceId = 'world'
      if (components.scene?.placeId === worldId) components.scene.placeId = 'world'
      for (const connection of components.place?.connections ?? []) if (connection.toPlaceId === worldId) connection.toPlaceId = 'world'
      if (Array.isArray(components.scene?.participantEntityIds)) components.scene.participantEntityIds = components.scene.participantEntityIds.map(id => id === worldId ? 'world' : id)
    }
  }
  if (!Object.hasOwn(next.entities, 'world')) {
    if (Object.keys(next.entities).length) throw new Error('Select the v1 worldEntityId explicitly before upgrading')
    next.entities.world = createWorldRoot().entities.world
  }
  if (!isRecord(next.entities.world.components)) throw new Error('The World v1 world components are invalid')
  next.entities.world.components.world = {
    ...next.entities.world.components.world,
    ...(options.currentSceneId === undefined ? {} : { currentSceneId: options.currentSceneId }),
  }
  return validateWorldRoot(next)
}

export function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0 }
export function requiredString(value, field) {
  if (!nonEmpty(value)) throw new Error(`The World ${field} must be a non-empty string`)
  return value
}
function optionalString(value, field, allowEmpty = false) {
  if (value[field] !== undefined && (typeof value[field] !== 'string' || (!allowEmpty && !nonEmpty(value[field])))) throw new Error(`The World ${field} is invalid`)
}
function integerBetween(value, min, max) { return Number.isInteger(value) && value >= min && value <= max }
function isJsonValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isJsonValue)
  return isRecord(value) && Object.values(value).every(isJsonValue)
}
