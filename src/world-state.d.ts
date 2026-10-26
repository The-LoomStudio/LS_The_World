import type { WorldBranchRef, WorldEntity, WorldJsonPatchOperation, WorldMutation, WorldStateSnapshot, WorldTimeValue, WorldTimeComponent, WeatherComponent } from './contracts.js'

export const worldInitialComponents: WorldEntity['components']
export function isKnownWorldTime(value: unknown): value is WorldTimeValue
export function createWorldRoot(): WorldStateSnapshot
export function validateWorldRoot(root: unknown): WorldStateSnapshot
export function applyJsonPatch(snapshot: WorldStateSnapshot, patch: WorldJsonPatchOperation[]): WorldStateSnapshot
export function applyMutation(snapshot: WorldStateSnapshot, mutation: WorldMutation, revisionId: string, target: WorldBranchRef): WorldStateSnapshot
export function mutationPatch(mutation: WorldMutation): WorldJsonPatchOperation[]
export function patchStateOperations(patch: WorldJsonPatchOperation[]): Array<{ op: 'set'; path: string; value: unknown } | { op: 'remove'; path: string }>
export function projectCurrentWorld(snapshot: WorldStateSnapshot): {
  world: WorldEntity & { id: string }
  scene?: WorldEntity & { id: string }
  place?: WorldEntity & { id: string }
  time?: Omit<WorldTimeComponent, 'value'> & { value: WorldTimeValue }
  weather?: WeatherComponent & { kind: NonNullable<WeatherComponent['kind']> }
  background?: NonNullable<WorldEntity['components']['background']>
}
export function upgradeLegacyWorld(root: unknown, options?: { worldEntityId?: string; currentSceneId?: string }): WorldStateSnapshot
export function isRecord(value: unknown): value is Record<string, unknown>
export function requiredString(value: unknown, field: string): string
