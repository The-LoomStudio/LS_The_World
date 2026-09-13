export type WeatherKind = 'clear' | 'rain' | 'snow' | 'storm' | 'fog' | 'custom'
export type WeatherState = { kind: WeatherKind; label?: string; intensity?: number; startedAt?: string }
export type AmbientTrack = { id: string; assetId: string; loop: boolean; volume: number; fadeMs: number; enabled: boolean }

export function normalizeWeather(value: unknown): WeatherState {
  if (typeof value === 'string') return { kind: ['clear', 'rain', 'snow', 'storm', 'fog'].includes(value) ? value as WeatherKind : 'custom', label: value }
  if (!value || typeof value !== 'object') throw new Error('Weather state must be a string or object')
  const record = value as Record<string, unknown>
  const kind = record.kind
  if (typeof kind !== 'string' || !['clear', 'rain', 'snow', 'storm', 'fog', 'custom'].includes(kind)) throw new Error('Weather kind is unsupported')
  const intensity = record.intensity
  if (intensity !== undefined && (typeof intensity !== 'number' || intensity < 0 || intensity > 1)) throw new Error('Weather intensity must be between 0 and 1')
  return { kind: kind as WeatherKind, ...(typeof record.label === 'string' ? { label: record.label } : {}), ...(intensity === undefined ? {} : { intensity }), ...(typeof record.startedAt === 'string' ? { startedAt: record.startedAt } : {}) }
}

export function resolveAmbientTransition(previous: AmbientTrack | undefined, next: AmbientTrack | undefined): { action: 'none' | 'start' | 'stop' | 'crossfade'; from?: AmbientTrack; to?: AmbientTrack } {
  if (!next || !next.enabled) return previous?.enabled ? { action: 'stop', from: previous } : { action: 'none' }
  if (!previous || !previous.enabled) return { action: 'start', to: next }
  if (previous.id === next.id && previous.assetId === next.assetId) return { action: 'none' }
  return { action: 'crossfade', from: previous, to: next }
}

export function shouldReplayAmbient(previousScope: string | undefined, nextScope: string, transition: ReturnType<typeof resolveAmbientTransition>): boolean {
  return previousScope !== nextScope && transition.action !== 'none'
}
