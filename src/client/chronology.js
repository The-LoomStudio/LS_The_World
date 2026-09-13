/** 仅投影显式世界时间；不读取系统时钟，也不推断历法。 */
export function inspectChronology(entities) {
  const calendars = entities
    .map(([, entity]) => entity.components?.calendar)
    .filter(Boolean)
  return entities.flatMap(([entityId, entity]) => {
    const time = entity.components?.worldTime
    if (!time) return []
    const matches = calendars.filter(calendar => calendar.id === time.value.calendarId)
    const calendar = matches.length === 1 ? matches[0] : null
    const month = calendar?.months[time.value.month - 1]
    let diagnostic = null
    if (!matches.length) diagnostic = `未找到历法：${time.value.calendarId}`
    else if (matches.length > 1) diagnostic = `历法 ID 重复：${time.value.calendarId}`
    else if (!month) diagnostic = `历法中不存在第 ${time.value.month} 月`
    else if (!Number.isInteger(time.value.day) || time.value.day < 1 || time.value.day > month.days) {
      diagnostic = `当前日期超出 ${month.name} 的 ${month.days} 天范围`
    }
    return [{ entityId, time, calendar, diagnostic }]
  })
}

export function renderChronology(root, entities) {
  const document = root.ownerDocument
  const entries = inspectChronology(entities)
  root.replaceChildren()
  if (!entries.length) {
    root.textContent = '世界时间：未设置'
    return
  }
  for (const { entityId, time, calendar, diagnostic } of entries) {
    const section = document.createElement('section')
    const heading = document.createElement('h3')
    const value = time.value
    heading.textContent = `${entityId} · ${value.year}年 ${value.month}月 ${value.day}日 ${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}${time.paused ? '（暂停）' : ''}`
    section.append(heading)
    if (diagnostic) {
      const message = document.createElement('p')
      message.textContent = diagnostic
      section.append(message)
    }
    if (calendar) {
      const label = document.createElement('label')
      label.textContent = `${calendar.name} · 查看月份 `
      const select = document.createElement('select')
      for (const [index, month] of calendar.months.entries()) {
        const option = document.createElement('option')
        option.value = String(index)
        option.textContent = `${month.name}（${month.days}天）`
        select.append(option)
      }
      select.value = String(value.month - 1)
      label.append(select)
      const days = document.createElement('ol')
      days.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;'
      const renderDays = () => {
        days.replaceChildren()
        if (select.value === '') return
        const month = calendar.months[Number(select.value)]
        if (!month) return
        for (let day = 1; day <= month.days; day += 1) {
          const cell = document.createElement('li')
          cell.textContent = String(day)
          cell.style.cssText = 'padding:6px;min-width:2em;text-align:center;border:1px solid currentColor;border-radius:4px;'
          if (Number(select.value) === value.month - 1 && day === value.day) {
            cell.setAttribute('aria-current', 'date')
            cell.style.fontWeight = 'bold'
            cell.style.background = 'color-mix(in srgb,currentColor 18%,transparent)'
          }
          days.append(cell)
        }
      }
      select.addEventListener('change', renderDays)
      renderDays()
      const note = document.createElement('p')
      note.textContent = '仅浏览历法月份，不修改 State。未定义日期到星期的锚点，因此不推断星期排列。'
      section.append(label, days, note)
    }
    root.append(section)
  }
}
