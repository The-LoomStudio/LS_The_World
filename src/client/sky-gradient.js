const stops = [[0, ['#071329','#18294c','#0a1020']], [5, ['#17254a','#c16d72','#271b35']], [7, ['#4d7eb5','#f0b477','#725c73']], [10, ['#5d9bd1','#b8d7e8','#7ca4bd']], [16, ['#4f91c7','#f3d3a0','#88a8b8']], [19, ['#263d73','#e18b6c','#49345a']], [21, ['#101d3d','#473b68','#171a35']], [24, ['#071329','#18294c','#0a1020']]]
export function skyCssAt(hour, minute = 0) {
  const value = ((hour * 60 + minute) % 1440 + 1440) % 1440 / 60
  const upper = stops.findIndex(([at]) => at >= value)
  const index = upper <= 0 ? stops.length - 1 : upper
  const [endAt, end] = stops[index]
  const [startAt, start] = stops[index - 1] ?? stops[stops.length - 2]
  const span = endAt > startAt ? endAt - startAt : endAt + 24 - startAt
  const elapsed = value >= startAt ? value - startAt : value + 24 - startAt
  const t0 = Math.max(0, Math.min(1, elapsed / span)); const t = t0 * t0 * (3 - 2 * t0)
  return `linear-gradient(180deg,${mix(start[0], end[0], t)} 0%,${mix(start[1], end[1], t)} 58%,${mix(start[2], end[2], t)} 100%)`
}
function mix(a, b, t) { const x = hex(a), y = hex(b); return `#${[0,1,2].map(i => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2,'0')).join('')}` }
function hex(value) { const raw = value.slice(1); return [0,2,4].map(i => Number.parseInt(raw.slice(i,i+2),16)) }
