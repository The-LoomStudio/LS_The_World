import type { WorldEntity, WorldStateSnapshot, WorldTimeValue } from './contracts.js'

export type WorldDebugProjection = {
  places: Array<{ id: string; name: string; parentPlaceId?: string; connectionCount: number }>
  currentTime?: WorldTimeValue
  calendars: Array<{ id: string; name: string; monthCount: number }>
  backgrounds: Array<{ id: string; name: string; available: boolean }>
  weather?: { kind: string; label?: string; intensity?: number }
}

export function projectWorldDebug(snapshot: WorldStateSnapshot): WorldDebugProjection {
  const places: WorldDebugProjection['places'] = []
  const calendars: WorldDebugProjection['calendars'] = []
  const backgrounds: WorldDebugProjection['backgrounds'] = []
  let currentTime: WorldTimeValue | undefined
  let weather: WorldDebugProjection['weather']
  for (const entity of Object.values(snapshot.entities)) {
    if (entity.components.place) places.push({ id: entity.id, name: entity.components.place.name, ...(entity.components.place.parentPlaceId ? { parentPlaceId: entity.components.place.parentPlaceId } : {}), connectionCount: entity.components.place.connections?.length ?? 0 })
    if (entity.components.calendar) calendars.push({ id: entity.components.calendar.id, name: entity.components.calendar.name, monthCount: entity.components.calendar.months.length })
    if (entity.components.worldTime) currentTime = entity.components.worldTime.value
    if (entity.components.weather) weather = entity.components.weather
    if (entity.components.background) backgrounds.push({ id: entity.components.background.id, name: entity.components.background.name, available: entity.components.background.availability.status === 'available' })
  }
  places.sort((a, b) => a.name.localeCompare(b.name))
  calendars.sort((a, b) => a.name.localeCompare(b.name))
  backgrounds.sort((a, b) => a.name.localeCompare(b.name))
  return { places, calendars, backgrounds, ...(currentTime ? { currentTime } : {}), ...(weather ? { weather } : {}) }
}

export function buildLocatorText(snapshot: WorldStateSnapshot): string {
  const projection = projectWorldDebug(snapshot)
  const lines = projection.places.map(place => `${place.name} (${place.id})${place.parentPlaceId ? ` <- ${place.parentPlaceId}` : ''}`)
  return lines.length > 0 ? lines.join('\n') : '（暂无地点）'
}

export function buildAtlasText(snapshot: WorldStateSnapshot): string {
  const places = Object.values(snapshot.entities).filter(entity => entity.components.place)
  if (places.length === 0) return '（暂无地图地点）'
  return places.map(entity => {
    const place = entity.components.place!
    const parent = place.parentPlaceId ? `；上级：${place.parentPlaceId}` : ''
    const links = place.connections?.map(connection => `${connection.relation}:${connection.toPlaceId}`).join('、')
    return `${place.name} (${entity.id})${parent}${links ? `；连接：${links}` : ''}${place.description ? `；${place.description}` : ''}`
  }).join('\n')
}
