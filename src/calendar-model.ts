import type { CalendarComponent, WorldTimeValue } from './contracts.js'

export type CalendarDayCell = { day: number; weekday?: number; inMonth: boolean }

export function formatWorldDate(value: WorldTimeValue, calendar: CalendarComponent): string {
  const month = calendar.months.find(item => item.id === String(value.month)) ?? calendar.months[value.month - 1]
  return `${value.year}年${month?.name ?? `${value.month}月`}${value.day}日 ${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`
}

export function buildCalendarMonth(calendar: CalendarComponent, year: number, monthIndex: number, weekdayOfFirstDay = 0): CalendarDayCell[] {
  const month = calendar.months[monthIndex - 1]
  if (!month || month.days < 1) throw new Error(`Calendar month is invalid: ${monthIndex}`)
  const cells: CalendarDayCell[] = []
  const offset = Math.max(0, weekdayOfFirstDay - (calendar.weekStartsOn ?? 0))
  for (let index = 0; index < offset; index += 1) cells.push({ day: 0, inMonth: false })
  for (let day = 1; day <= month.days; day += 1) cells.push({ day, weekday: (offset + day - 1) % Math.max(1, calendar.weekdays?.length ?? 7), inMonth: true })
  return cells
}
