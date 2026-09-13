import type { WorldEntity, WorldResourceReference } from './contracts.js'

export type ResourceDiagnostic = WorldResourceReference & {
  ownerEntityId: string
  status: 'available' | 'missing' | 'revoked'
  reason?: string
}

export function collectResourceDiagnostics(entities: Record<string, WorldEntity>): ResourceDiagnostic[] {
  const result: ResourceDiagnostic[] = []
  for (const [ownerEntityId, entity] of Object.entries(entities)) {
    const references = [
      ...(entity.components.place?.resources ?? []),
      ...(entity.components.scene?.resources ?? []),
      ...(entity.components.background ? [entity.components.background.asset] : []),
    ]
    for (const reference of references) {
      result.push({
        ...reference,
        ownerEntityId,
        status: reference.availability.status,
        ...(reference.availability.status !== 'available' && reference.availability.reason
          ? { reason: reference.availability.reason }
          : {}),
      })
    }
  }
  return result
}

export function summarizeResourceDiagnostics(entities: Record<string, WorldEntity>) {
  const resources = collectResourceDiagnostics(entities)
  return {
    total: resources.length,
    available: resources.filter(item => item.status === 'available').length,
    missing: resources.filter(item => item.status === 'missing').length,
    revoked: resources.filter(item => item.status === 'revoked').length,
    resources,
  }
}
