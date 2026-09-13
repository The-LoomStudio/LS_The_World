import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectChronology } from '../src/client/chronology.js'

const calendar = (id, days = 30) => ({
  components: { calendar: { id, name: id, months: [{ id: 'spring', name: '春月', days }] } },
})
const clock = (calendarId, day = 3) => ({
  components: { worldTime: { version: 1, value: { calendarId, year: 42, month: 1, day, hour: 7, minute: 15 } } },
})

test('按日历 ID 匹配，不把第一个历法混入其他世界时间', () => {
  const result = inspectChronology([
    ['wrong-calendar', calendar('wrong')],
    ['clock-a', clock('custom')],
    ['right-calendar', calendar('custom', 9)],
    ['clock-b', clock('wrong')],
  ])
  assert.equal(result.length, 2)
  assert.equal(result[0].calendar.id, 'custom')
  assert.equal(result[0].calendar.months[0].days, 9)
  assert.equal(result[1].calendar.id, 'wrong')
  assert.equal(result[0].diagnostic, null)
})

test('缺失与重复历法显式诊断，不用其他历法顶替', () => {
  assert.match(inspectChronology([['clock', clock('missing')]])[0].diagnostic, /未找到/)
  const [entry] = inspectChronology([['clock', clock('x')], ['a', calendar('x')], ['b', calendar('x')]])
  assert.equal(entry.calendar, null)
  assert.match(entry.diagnostic, /重复/)
})

test('使用作者定义的月份天数检查日期；无世界时间时不产生默认日期', () => {
  assert.match(inspectChronology([['clock', clock('x', 10)], ['c', calendar('x', 9)]])[0].diagnostic, /超出/)
  assert.deepEqual(inspectChronology([['c', calendar('x')]]), [])
})
