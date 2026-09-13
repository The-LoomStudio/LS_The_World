/** The World data contract. Runtime state is owned by Loom State, not this package. */

export const THE_WORLD_SCHEMA_VERSION = 1 as const

export type WorldSchemaVersion = typeof THE_WORLD_SCHEMA_VERSION

export type WorldEntityKind = 'world' | 'place' | 'scene'

export type WorldBranchRef = {
  timelineId: string
  branchId: string
}

export type WorldEntity = {
  schemaVersion: WorldSchemaVersion
  id: string
  kind: WorldEntityKind
  branch: WorldBranchRef
  createdBy: 'author' | 'narrative' | 'migration' | 'system'
  createdAt: string
  updatedAt: string
  components: {
    place?: PlaceComponent
    scene?: SceneComponent
    worldTime?: WorldTimeComponent
    calendar?: CalendarComponent
    background?: BackgroundReference
    weather?: WeatherComponent
  }
}

export type WorldResourceRole = 'image' | 'audio' | 'map' | 'background' | 'other'

export type WorldResourceReference = {
  id: string
  kind: 'asset' | 'prompt-resource'
  role: WorldResourceRole
  label?: string
  availability: ResourceAvailability
}

export type ResourceAvailability =
  | { status: 'available' }
  | { status: 'missing' | 'revoked'; reason?: string; observedAt: string }

export type BackgroundReference = {
  id: string
  asset: WorldResourceReference & { kind: 'asset'; role: 'background' }
  name: string
  description: string
  source: string
  availability: ResourceAvailability
}

export type PlaceConnection = {
  toPlaceId: string
  relation: 'adjacent' | 'contains' | 'exits' | 'custom'
  label?: string
  bidirectional?: boolean
}

export type PlacePosition = {
  x: number
  y: number
  z?: number
  space?: string
}

export type PlaceComponent = {
  version: 1
  name: string
  description?: string
  parentPlaceId?: string
  connections?: PlaceConnection[]
  position?: PlacePosition
  facts?: Record<string, string | number | boolean | null>
  resources?: WorldResourceReference[]
}

export type SceneComponent = {
  version: 1
  name: string
  description?: string
  placeId?: string
  participantEntityIds?: string[]
  resources?: WorldResourceReference[]
}

export type WorldTimeValue = {
  calendarId: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second?: number
  millisecond?: number
}

export type WorldTimeComponent = {
  version: 1
  value: WorldTimeValue
  timeZone?: string
  paused?: boolean
}

export type WeatherComponent = {
  version: 1
  kind: 'clear' | 'rain' | 'snow' | 'storm' | 'fog' | 'custom'
  label?: string
  intensity?: number
  startedAt?: string
}

export type CalendarMonth = {
  id: string
  name: string
  days: number
}

export type CalendarWeekday = {
  id: string
  name: string
}

export type CalendarComponent = {
  version: 1
  id: string
  name: string
  months: CalendarMonth[]
  weekdays?: CalendarWeekday[]
  weekStartsOn?: number
  eras?: Array<{ id: string; name: string; startsAtYear: number }>
}

export type WorldStateSnapshot = {
  schemaVersion: WorldSchemaVersion
  branch: WorldBranchRef
  entities: Record<string, WorldEntity>
}

export type WorldMutationOperation =
  | { op: 'upsert-entity'; entity: WorldEntity }
  | { op: 'set-component'; entityId: string; component: keyof WorldEntity['components']; value: WorldEntity['components'][keyof WorldEntity['components']] }
  | { op: 'remove-component'; entityId: string; component: keyof WorldEntity['components'] }
  | { op: 'remove-entity'; entityId: string }

export type WorldMutation = {
  schemaVersion: WorldSchemaVersion
  target: WorldBranchRef
  expectedRevisionId: string
  idempotencyKey: string
  operations: WorldMutationOperation[]
}

export type WorldJsonPatchOperation =
  | { op: 'add' | 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string }

export type WorldJsonPatchMutation = {
  schemaVersion: WorldSchemaVersion
  target: WorldBranchRef
  expectedRevisionId: string
  idempotencyKey: string
  patch: WorldJsonPatchOperation[]
}
