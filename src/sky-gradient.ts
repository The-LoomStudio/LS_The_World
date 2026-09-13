/** Natural dynamic-sky palette for world time driven backgrounds. */
export type SkyPalette = { top: string; horizon: string; ambient: string; overlay: string }
const stops: Array<[number, SkyPalette]> = [
  [0, { top: '#071329', horizon: '#18294c', ambient: '#0a1020', overlay: 'rgba(3,8,20,.46)' }],
  [5, { top: '#17254a', horizon: '#c16d72', ambient: '#271b35', overlay: 'rgba(10,12,32,.28)' }],
  [7, { top: '#4d7eb5', horizon: '#f0b477', ambient: '#725c73', overlay: 'rgba(24,30,56,.12)' }],
  [10, { top: '#5d9bd1', horizon: '#b8d7e8', ambient: '#7ca4bd', overlay: 'rgba(255,255,255,.04)' }],
  [16, { top: '#4f91c7', horizon: '#f3d3a0', ambient: '#88a8b8', overlay: 'rgba(255,255,255,.02)' }],
  [19, { top: '#263d73', horizon: '#e18b6c', ambient: '#49345a', overlay: 'rgba(19,16,42,.18)' }],
  [21, { top: '#101d3d', horizon: '#473b68', ambient: '#171a35', overlay: 'rgba(4,8,22,.34)' }],
  [24, { top: '#071329', horizon: '#18294c', ambient: '#0a1020', overlay: 'rgba(3,8,20,.46)' }],
]
export function skyPaletteAt(hour: number, minute = 0): SkyPalette {
  const value = ((hour * 60 + minute) % 1440 + 1440) % 1440 / 60
  const upper = stops.findIndex(([at]) => at >= value)
  const index = upper <= 0 ? stops.length - 1 : upper
  const [endAt, end] = stops[index]
  const [startAt, start] = stops[index - 1] ?? stops[stops.length - 2]
  const span = endAt > startAt ? endAt - startAt : endAt + 24 - startAt
  const elapsed = value >= startAt ? value - startAt : value + 24 - startAt
  const t = smoothstep(Math.max(0, Math.min(1, elapsed / span)))
  return { top: mixHex(start.top, end.top, t), horizon: mixHex(start.horizon, end.horizon, t), ambient: mixHex(start.ambient, end.ambient, t), overlay: end.overlay }
}
export function skyCss(palette: SkyPalette): string { return `linear-gradient(180deg, ${palette.top} 0%, ${palette.horizon} 58%, ${palette.ambient} 100%)` }
function smoothstep(t: number) { return t * t * (3 - 2 * t) }
function mixHex(a: string, b: string, t: number) { const x = hex(a), y = hex(b); return `#${[0,1,2].map(i => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0')).join('')}` }
function hex(value: string) { const raw = value.replace('#', ''); return [0,2,4].map(i => Number.parseInt(raw.slice(i, i + 2), 16)) }
