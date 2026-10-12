import { inspectLegacyWorldImport } from '../src/migration-report.js'
import { skyPaletteAt, skyCss } from '../src/sky-gradient.js'

const palette = skyPaletteAt(5, 30)
if (!palette.top.startsWith('#') || !skyCss(palette).includes('linear-gradient')) throw new Error('sky smoke failed')
const report = inspectLegacyWorldImport({
  branch: { timelineId: 'timeline-smoke', branchId: 'branch-smoke' },
  revisionId: 'rev-1',
  idempotencyKey: 'smoke-1',
  calendar: { id: 'example', name: '示例历法', months: Array.from({ length: 12 }, (_, index) => ({ id: String(index + 1), name: `${index + 1}月`, days: 30 })) },
  worldStateText: '<WorldState>时间: 2026-09-13 05:30</WorldState>',
})
if (report.status === 'error' || report.operationCount !== 1) throw new Error('migration smoke failed')
console.log('the-world smoke passed')
