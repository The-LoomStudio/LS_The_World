import type { CalendarComponent, WorldEntity, WorldStateSnapshot, WorldTimeComponent } from './contracts.js'
import { validateWorldRoot } from './world-state.js'

export {
  applyMutation as applyWorldMutation,
  applyJsonPatch as applyWorldJsonPatch,
  validateWorldRoot as validateWorldSnapshot,
  createWorldRoot,
  projectCurrentWorld,
  upgradeLegacyWorld,
} from './world-state.js'

export function findPlaces(snapshot: WorldStateSnapshot, parentPlaceId?: string): Array<WorldEntity & { id: string }> {
  return Object.entries(validateWorldRoot(snapshot).entities)
    .filter(([, entity]) => entity.components.place && entity.components.place.parentPlaceId === parentPlaceId)
    .map(([id, entity]) => ({ id, ...entity }))
}

export function advanceWorldTime(component: WorldTimeComponent, minutes: number, calendar: CalendarComponent): WorldTimeComponent {
  if (!Number.isInteger(minutes)) throw new Error('World time advance must use integer minutes')
  if (calendar.id !== component.value.calendarId || !calendar.months.length) throw new Error('World time requires its Calendar')
  const value = { ...component.value }
  const monthDays = calendar.months[value.month - 1]?.days
  if (!monthDays || value.day < 1 || value.day > monthDays) throw new Error('World date is outside its Calendar')
  const totalMinutes = value.hour * 60 + value.minute + minutes
  let days = Math.floor(totalMinutes / 1440)
  const timeOfDay = ((totalMinutes % 1440) + 1440) % 1440
  value.hour = Math.floor(timeOfDay / 60)
  value.minute = timeOfDay % 60
  while (days > 0) {
    const remaining = calendar.months[value.month - 1]!.days - value.day
    if (days <= remaining) { value.day += days; break }
    days -= remaining + 1
    value.day = 1
    if (++value.month > calendar.months.length) { value.month = 1; value.year += 1 }
  }
  while (days < 0) {
    if (value.day + days >= 1) { value.day += days; break }
    days += value.day
    if (--value.month < 1) { value.month = calendar.months.length; value.year -= 1 }
    value.day = calendar.months[value.month - 1]!.days
  }
  return { ...component, value }
}
