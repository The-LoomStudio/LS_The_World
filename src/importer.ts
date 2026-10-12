import { parseMapUpdate, parseWorldState } from './migration-parser.js'
import type { CalendarComponent, WorldBranchRef, WorldEntity, WorldMutationOperation } from './contracts.js'
import { normalizeWeather } from './media-model.js'

export type LegacyWorldImport = {
  branch: WorldBranchRef
  revisionId: string
  idempotencyKey: string
  calendar?: CalendarComponent
  worldStateText?: string
  mapUpdateText?: string
}

export type LegacyWorldImportResult = {
  operations: WorldMutationOperation[]
  worldState?: ReturnType<typeof parseWorldState>
  diagnostics: Array<{ severity: 'warning' | 'error'; code: string; message: string }>
}

export function createLegacyWorldImport(input: LegacyWorldImport): LegacyWorldImportResult {
  if (!input.branch.timelineId || !input.branch.branchId) throw new Error('Legacy import requires a target Timeline and Branch')
  if (!input.revisionId || !input.idempotencyKey) throw new Error('Legacy import requires revisionId and idempotencyKey')
  const diagnostics: LegacyWorldImportResult['diagnostics'] = []
  const operations: WorldMutationOperation[] = []
  let worldState: ReturnType<typeof parseWorldState> | undefined
  if (input.worldStateText) {
    worldState = parseWorldState(input.worldStateText)
    diagnostics.push(...worldState.diagnostics)
    const entity = worldStateEntity(worldState, input.calendar)
    operations.push({ op: 'upsert-entity', entityId: 'world', entity })
  }
  if (input.mapUpdateText) {
    const parsed = parseMapUpdate(input.mapUpdateText)
    diagnostics.push(...parsed.diagnostics)
    for (const operation of parsed.operations) {
      if (operation.op === 'remove-entity') operations.push(operation)
      else operations.push({ op: 'upsert-entity', entityId: operation.entity.id, entity: { components: operation.entity.components } })
    }
  }
  return { operations, ...(worldState ? { worldState } : {}), diagnostics }
}

function worldStateEntity(state: ReturnType<typeof parseWorldState>, calendar?: CalendarComponent): WorldEntity {
  if (state.time && !calendar) throw new Error('Legacy world time requires an explicit Calendar')
  return {
    components: {
      world: {},
      ...(calendar ? { calendar } : {}),
      ...(state.time ? { worldTime: { value: { ...parseTime(state.time), calendarId: calendar!.id } } } : {}),
      ...(state.weather ? { weather: { ...normalizeWeather(state.weather) } } : {}),
    },
  }
}

function parseTime(value: string) {
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):?(\d{2})?)?/) 
  if (!match) throw new Error(`Legacy world time is not ISO-like: ${value}`)
  return { calendarId: 'gregorian', year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4] ?? 0), minute: Number(match[5] ?? 0) }
}
