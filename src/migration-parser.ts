import type { PlaceComponent, WorldBranchRef, WorldEntity, WorldEntityKind } from './contracts.js'

export type MigrationDiagnostic = {
  severity: 'warning' | 'error'
  code: string
  message: string
  index?: number
  field?: string
}

export type ParsedWorldState = {
  values: Record<string, string>
  time?: string
  season?: string
  period?: string
  weather?: string
  location?: string
  scene?: string
  illustration?: string
  diagnostics: MigrationDiagnostic[]
}

/** World entities are deliberately incomplete until an importer supplies branch and timestamps. */
export type MigrationWorldEntity = Omit<WorldEntity, 'branch' | 'createdAt' | 'updatedAt'> & {
  branch?: WorldBranchRef
  createdAt?: string
  updatedAt?: string
  source: 'sillytavern'
  sourceAttributes?: Record<string, unknown>
}

export type MigrationWorldMutationOperation =
  | { op: 'upsert-entity'; entity: MigrationWorldEntity }
  | { op: 'remove-entity'; entityId: string }

export type ParsedMapUpdate = {
  operations: MigrationWorldMutationOperation[]
  entities: MigrationWorldEntity[]
  diagnostics: MigrationDiagnostic[]
}

export class MigrationParseError extends Error {
  readonly diagnostics: MigrationDiagnostic[]

  constructor(message: string, diagnostics: MigrationDiagnostic[]) {
    super(message)
    this.name = 'MigrationParseError'
    this.diagnostics = diagnostics
  }
}

const WORLD_STATE_KEYS = ['时间', '季节', '时段', '天气', '地点', '场景', '插图'] as const
const WORLD_STATE_KEY_MAP: Record<string, keyof Omit<ParsedWorldState, 'values' | 'diagnostics'>> = {
  时间: 'time',
  季节: 'season',
  时段: 'period',
  天气: 'weather',
  地点: 'location',
  场景: 'scene',
  插图: 'illustration',
}

export function parseWorldState(text: string): ParsedWorldState {
  if (typeof text !== 'string') throw new TypeError('WorldState input must be a string')
  const diagnostics: MigrationDiagnostic[] = []
  const body = extractTag(text, 'WorldState', diagnostics)
  if (!body.trim()) {
    const error = diagnostic('error', 'empty-world-state', 'WorldState 内容为空')
    throw new MigrationParseError(error.message, [error])
  }

  const values: Record<string, string> = {}
  const result: ParsedWorldState = { values, diagnostics }
  const keys = WORLD_STATE_KEYS.join('|')
  const pattern = new RegExp(`(?:^|\\s)(${keys})\\s*[:：]\\s*([\\s\\S]*?)(?=\\s*(?:${keys})\\s*[:：]|$)`, 'g')
  for (const match of body.matchAll(pattern)) {
    const key = match[1]
    const value = match[2].trim()
    if (!value) {
      diagnostics.push(diagnostic('warning', 'empty-world-state-value', `WorldState 字段“${key}”为空`, undefined, key))
      continue
    }
    values[key] = value
    result[WORLD_STATE_KEY_MAP[key]] = value
  }

  if (Object.keys(values).length === 0) {
    const error = diagnostic('error', 'invalid-world-state', '未找到可识别的 WorldState 键值（支持：时间、季节、时段、天气、地点、场景、插图）')
    throw new MigrationParseError(error.message, [...diagnostics, error])
  }

  if (result.illustration) {
    diagnostics.push(diagnostic('warning', 'unresolved-resource-reference', '插图仅保留为字符串候选；导入方必须通过资源系统解析，不会自动访问 URL', undefined, '插图'))
  }
  return result
}

export function parseMapUpdate(text: string): ParsedMapUpdate {
  if (typeof text !== 'string') throw new TypeError('MapUpdate input must be a string')
  const diagnostics: MigrationDiagnostic[] = []
  const body = extractTag(text, 'MapUpdate', diagnostics)
  if (!body.trim()) {
    const error = diagnostic('error', 'empty-map-update', 'MapUpdate 内容为空')
    throw new MigrationParseError(error.message, [error])
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch (cause) {
    const detail = cause instanceof Error ? `：${cause.message}` : ''
    const error = diagnostic('error', 'invalid-map-update-json', `MapUpdate 不是有效 JSON${detail}`)
    throw new MigrationParseError(error.message, [error])
  }
  if (!Array.isArray(parsed)) {
    const error = diagnostic('error', 'map-update-not-array', 'MapUpdate 顶层必须是 JSON 数组')
    throw new MigrationParseError(error.message, [error])
  }

  const operations: MigrationWorldMutationOperation[] = []
  const entities: MigrationWorldEntity[] = []
  parsed.forEach((entry, index) => {
    if (!isRecord(entry)) {
      diagnostics.push(diagnostic('error', 'map-update-entry-not-object', 'MapUpdate 数组成员必须是对象', index))
      return
    }
    const op = entry.op
    if (op !== 'add_or_update' && op !== 'remove') {
      diagnostics.push(diagnostic('error', 'unknown-map-update-op', `不支持的 MapUpdate 操作：${String(op)}`, index, 'op'))
      return
    }
    const id = typeof entry.id === 'string' ? entry.id.trim() : ''
    if (!id) {
      diagnostics.push(diagnostic('error', 'missing-map-node-id', 'MapUpdate 节点必须提供非空 id', index, 'id'))
      return
    }
    if (op === 'remove') {
      operations.push({ op: 'remove-entity', entityId: id })
      return
    }

    const name = typeof entry.name === 'string' ? entry.name.trim() : undefined
    if (!name) diagnostics.push(diagnostic('warning', 'missing-map-node-name', `节点“${id}”缺少 name；这是对既有节点的部分更新，导入时需要与现有实体合并`, index, 'name'))
    const entity = mapNodeToEntity(id, name, entry, diagnostics, index)
    entities.push(entity)
    operations.push({ op: 'upsert-entity', entity })
  })

  if (diagnostics.some(item => item.severity === 'error')) {
    throw new MigrationParseError('MapUpdate 包含无法迁移的条目', diagnostics)
  }
  return { operations, entities, diagnostics }
}

function mapNodeToEntity(id: string, name: string | undefined, node: Record<string, unknown>, diagnostics: MigrationDiagnostic[], index: number): MigrationWorldEntity {
  const kind = mapEntityKind(node.type)
  const place: PlaceComponent | undefined = name ? { version: 1, name } : undefined
  if (place && typeof node.description === 'string' && node.description.trim()) place.description = node.description.trim()
  if (place && typeof node.parentId === 'string' && node.parentId.trim()) place.parentPlaceId = node.parentId.trim()
  if (typeof node.coords === 'string' && node.coords.trim()) {
    const parts = node.coords.split(',').map(value => Number(value.trim()))
    if (parts.length >= 2 && parts.slice(0, 2).every(Number.isFinite) && place) place.position = { x: parts[0], y: parts[1] }
    else diagnostics.push(diagnostic('warning', 'invalid-map-node-coords', `节点“${id}”的 coords 不是有效的 x,y 数值，已保留在 sourceAttributes`, index, 'coords'))
  }

  const known = new Set(['op', 'id', 'name', 'description', 'parentId', 'coords'])
  const sourceAttributes: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) if (!known.has(key)) sourceAttributes[key] = value
  if (typeof node.illustration === 'string' && node.illustration.trim()) {
    diagnostics.push(diagnostic('warning', 'unresolved-resource-reference', `节点“${id}”的 illustration 仅保留字符串候选；不会自动访问 URL`, index, 'illustration'))
  }
  return {
    schemaVersion: 1,
    id,
    kind,
    createdBy: 'migration',
    components: place ? { place } : {},
    source: 'sillytavern',
    ...(Object.keys(sourceAttributes).length > 0 ? { sourceAttributes } : {}),
  }
}

function mapEntityKind(type: unknown): WorldEntityKind {
  return type === 'world' || type === 'continent' || type === 'region' ? 'world' : 'place'
}

function extractTag(text: string, tag: string, diagnostics: MigrationDiagnostic[]): string {
  const pattern = new RegExp(`<${tag}\\s*>([\\s\\S]*?)<\\/${tag}>`, 'ig')
  const matches = [...text.matchAll(pattern)]
  if (matches.length > 1) diagnostics.push(diagnostic('warning', 'multiple-tag-blocks', `发现多个 <${tag}> 块，仅解析第一个`))
  if (matches.length > 0) return matches[0][1]
  return text
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function diagnostic(severity: MigrationDiagnostic['severity'], code: string, message: string, index?: number, field?: string): MigrationDiagnostic {
  return { severity, code, message, ...(index === undefined ? {} : { index }), ...(field === undefined ? {} : { field }) }
}

export type ParsedLegacyMap = {
  moveAllowed?: boolean
  root?: { name: string; children: string[] }
  diagnostics: MigrationDiagnostic[]
}

/** Parse ST's legacy human-readable <Map> block without persisting or mutating state. */
export function parseLegacyMap(text: string): ParsedLegacyMap {
  if (typeof text !== 'string') throw new TypeError('Legacy Map input must be a string')
  const diagnostics: MigrationDiagnostic[] = []
  const body = extractTag(text, 'Map', diagnostics).trim()
  if (!body) throw new MigrationParseError('Map 内容为空', [diagnostic('error', 'empty-map', 'Map 内容为空')])
  const move = body.match(/\[MOVEBLOCK\s*:\s*(YES|NO)\]/i)
  const moveAllowed = move ? move[1].toUpperCase() === 'YES' : undefined
  const cleaned = body.replace(/\[MOVEBLOCK\s*:\s*(YES|NO)\]/ig, '').trim()
  const firstLine = cleaned.split(/\r?\n/, 1)[0]?.trim() ?? ''
  if (!firstLine) throw new MigrationParseError('Map 未找到主地点', [diagnostic('error', 'missing-map-root', 'Map 未找到主地点')])
  const [rootName, ...children] = firstLine.split('|').map(value => value.trim()).filter(Boolean)
  if (!rootName) throw new MigrationParseError('Map 未找到主地点', [diagnostic('error', 'missing-map-root', 'Map 未找到主地点')])
  if (cleaned.split(/\r?\n/).length > 1) diagnostics.push(diagnostic('warning', 'legacy-map-extra-lines', '旧式 Map 的附加描述未自动写入结构化 State'))
  return { ...(moveAllowed === undefined ? {} : { moveAllowed }), root: { name: rootName, children }, diagnostics }
}
