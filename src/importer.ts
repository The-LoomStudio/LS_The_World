import { parseMapUpdate, parseWorldState, type MigrationWorldEntity } from './migration-parser.js'
import type { WorldBranchRef, WorldEntity, WorldMutationOperation } from './contracts.js'

export type LegacyWorldImport = {
  branch: WorldBranchRef
  revisionId: string
  idempotencyKey: string
  now: string
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
  if (!input.revisionId || !input.idempotencyKey || !input.now) throw new Error('Legacy import requires revisionId, idempotencyKey and now')
  const diagnostics: LegacyWorldImportResult['diagnostics'] = []
  const operations: WorldMutationOperation[] = []
  let worldState: ReturnType<typeof parseWorldState> | undefined
  if (input.worldStateText) {
    worldState = parseWorldState(input.worldStateText)
    diagnostics.push(...worldState.diagnostics)
    const entity = worldStateEntity(worldState, input.branch, input.now)
    operations.push({ op: 'upsert-entity', entity })
  }
  if (input.mapUpdateText) {
    const parsed = parseMapUpdate(input.mapUpdateText)
    diagnostics.push(...parsed.diagnostics)
    for (const operation of parsed.operations) {
      if (operation.op === 'remove-entity') operations.push(operation)
      else operations.push({ op: 'upsert-entity', entity: hydrateEntity(operation.entity, input.branch, input.now) })
    }
  }
  return { operations, ...(worldState ? { worldState } : {}), diagnostics }
}

function worldStateEntity(state: ReturnType<typeof parseWorldState>, branch: WorldBranchRef, now: string): WorldEntity {
  return {
    schemaVersion: 1,
    id: 'world-state',
    kind: 'world',
    branch,
    createdBy: 'migration',
    createdAt: now,
    updatedAt: now,
    components: {
      worldTime: state.time ? { version: 1, value: parseTime(state.time) } : undefined,
    },
  }
}

function parseTime(value: string) {
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):?(\d{2})?)?/) 
  if (!match) throw new Error(`Legacy world time is not ISO-like: ${value}`)
  return { calendarId: 'gregorian', year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4] ?? 0), minute: Number(match[5] ?? 0) }
}

function hydrateEntity(entity: MigrationWorldEntity, branch: WorldBranchRef, now: string): WorldEntity {
  return { ...entity, branch, createdAt: entity.createdAt ?? now, updatedAt: entity.updatedAt ?? now }
}
