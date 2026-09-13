import { createWeatherEffectController } from './weather-effects.js'
/** The World official client module. */

export function activate(context) {
  const background = context.backgrounds.register({
    id: 'the-world-neutral',
    name: 'The World 默认背景',
    description: 'The World 调试台的中性背景，供作者 Renderer 验证背景引用链路。',
    image: '/images/banner.png',
    source: 'official.the-world',
  })
  const renderer = context.renderers.register({
    id: 'official.the-world.debugger',
    name: 'The World 调试台',
    surface: 'shell.workspace-panel',
    instanceScope: 'workspace',
    adapter: 'direct',
    fallback: 'hidden',
  }, {
    mount(root) {
      root.dataset.loomTheWorldDebugger = 'true'
      root.style.cssText = 'display:grid;gap:12px;padding:20px;color:inherit;font:inherit;overflow:auto;align-content:start;'
      const title = document.createElement('h2')
      title.textContent = 'The World 调试台'
      title.style.margin = '0'
      const form = document.createElement('form')
      form.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:8px;'
      const timeline = document.createElement('input')
      timeline.placeholder = 'Timeline ID'
      timeline.required = true
      const branch = document.createElement('input')
      branch.placeholder = 'Branch ID'
      branch.required = true
      const submit = document.createElement('button')
      submit.type = 'submit'
      submit.textContent = '读取'
      form.append(timeline, branch, submit)
      const status = document.createElement('p')
      status.textContent = '输入目标 Timeline / Branch 读取世界状态。'
      status.style.margin = '0'
      const summary = document.createElement('section')
      summary.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;'
      const pre = document.createElement('pre')
      pre.style.cssText = 'margin:0;white-space:pre-wrap;overflow:auto;font:12px/1.5 ui-monospace,monospace;'
      const entities = document.createElement('section')
      entities.style.cssText = 'display:grid;gap:8px;'
      const weather = document.createElement('div')
      const weatherEffects = createWeatherEffectController(weather)
      weather.style.cssText = 'padding:10px;border-radius:8px;background:color-mix(in srgb,currentColor 8%,transparent);'
      const relations = document.createElement('section')
      relations.style.cssText = 'display:grid;gap:6px;'
      const map = document.createElement('div')
      map.style.cssText = 'min-height:220px;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;overflow:auto;'
      const relationsTitle = document.createElement('h3')
      relationsTitle.textContent = '地点关系'
      relationsTitle.style.margin = '0'
      relations.append(relationsTitle)
      const render = result => {
        const world = result?.state?.theWorld
        const list = world && world.entities && typeof world.entities === 'object' ? Object.entries(world.entities) : []
        const weatherEntry = list.find(([, entity]) => entity?.components?.weather)?.[1]?.components?.weather
        const backgroundEntry = list.find(([, entity]) => entity?.components?.background)?.[1]?.components?.background
        weatherEffects.set(weatherEntry?.kind ?? 'clear', weatherEntry?.intensity ?? 0)
        weather.textContent += weatherEntry ? `  ${weatherEntry.label ?? weatherEntry.kind}${weatherEntry.intensity == null ? '' : ` · 强度 ${weatherEntry.intensity}`}` : '  天气：未设置'
        weather.dataset.kind = weatherEntry?.kind ?? 'clear'
        const timeEntry = list.find(([, entity]) => entity?.components?.worldTime)?.[1]?.components?.worldTime?.value
        weather.style.background = skyPreview(timeEntry?.hour ?? 12, timeEntry?.minute ?? 0)
        if (backgroundEntry) weather.textContent += ` ｜ 背景：${backgroundEntry.name ?? backgroundEntry.id}${backgroundEntry.availability?.status === 'available' ? '' : '（资源不可用）'}`
        summary.replaceChildren(...[
          ['revision', result?.revisionId ?? '—'],
          ['实体', String(list.length)],
          ['schema', String(world?.schemaVersion ?? '—')],
        ].map(([label, value]) => {
          const card = document.createElement('div')
          card.style.cssText = 'padding:10px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:8px;'
          card.textContent = `${label}: ${value}`
          return card
        }))
        const edges = list.flatMap(([id, entity]) => (entity?.components?.place?.connections ?? []).map(connection => ({ from: id, ...connection })))
        renderMap(map, list, edges)
        relations.replaceChildren(relationsTitle, ...(edges.length ? edges.map(edge => {
          const item = document.createElement('div')
          item.style.cssText = 'padding:8px;border-left:3px solid currentColor;opacity:.85;'
          item.textContent = `${edge.from} → ${edge.toPlaceId} · ${edge.label ?? edge.relation}`
          return item
        }) : [Object.assign(document.createElement('p'), { textContent: '暂无地点连接' })]))
        entities.replaceChildren(...list.map(([id, entity]) => {
          const card = document.createElement('article')
          card.style.cssText = 'padding:10px;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;'
          const name = document.createElement('strong')
          name.textContent = `${entity?.kind ?? 'entity'} · ${id}`
          const detail = document.createElement('pre')
          detail.style.cssText = 'margin:6px 0 0;white-space:pre-wrap;font:12px/1.4 ui-monospace,monospace;'
          detail.textContent = JSON.stringify(entity?.components ?? {}, null, 2)
          card.append(name, detail)
          return card
        }))
        pre.textContent = JSON.stringify(result, null, 2)
      }
      form.addEventListener('submit', event => {
        event.preventDefault()
        submit.disabled = true
        status.textContent = '正在读取…'
        void context.rpc.call('official.the-world.readWorldState', { timelineId: timeline.value.trim(), branchId: branch.value.trim() }).then(result => {
          status.textContent = '读取成功'
          render(result)
        }).catch(error => {
          status.textContent = '读取失败'
          summary.replaceChildren()
          entities.replaceChildren()
          pre.textContent = error instanceof Error ? error.message : String(error)
        }).finally(() => { submit.disabled = false })
      })
      root.append(title, form, status, weather, summary, map, relations, entities, pre)
    },
  })
  return { dispose() { void renderer.dispose(); void background.dispose() } }
}

function weatherGlyph(kind) {
  return ({ clear: '☀️', rain: '🌧️', snow: '❄️', storm: '⛈️', fog: '🌫️', custom: '✨' })[kind] ?? '🌤️'
}

function skyPreview(hour, minute) {
  const t = (hour * 60 + minute) / 1440
  if (t < 0.2 || t > 0.88) return 'linear-gradient(180deg,#071329,#18294c 58%,#0a1020)'
  if (t < 0.32) return 'linear-gradient(180deg,#17254a,#c16d72 58%,#271b35)'
  if (t < 0.78) return 'linear-gradient(180deg,#5d9bd1,#f3d3a0 58%,#88a8b8)'
  return 'linear-gradient(180deg,#263d73,#e18b6c 58%,#49345a)'
}

function renderMap(container, list, edges) {
  const width = Math.max(520, list.length * 150)
  const height = 210
  const positions = new Map(list.map(([id, entity], index) => {
    const point = entity?.components?.place?.position
    return [id, { x: point?.x ?? 70 + (index % 4) * 130, y: point?.y ?? 70 + Math.floor(index / 4) * 80 }]
  }))
  const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\"', '&quot;')
  const lines = edges.map(edge => {
    const from = positions.get(edge.from), to = positions.get(edge.toPlaceId)
    return from && to ? `<line x1=\"${from.x}\" y1=\"${from.y}\" x2=\"${to.x}\" y2=\"${to.y}\" stroke=\"currentColor\" stroke-opacity=\".35\"/><text x=\"${(from.x + to.x) / 2}\" y=\"${(from.y + to.y) / 2 - 5}\" font-size=\"10\" fill=\"currentColor\">${esc(edge.label ?? edge.relation)}</text>` : ''
  }).join('')
  const nodes = list.map(([id, entity]) => {
    const point = positions.get(id)
    return `<g><circle cx=\"${point.x}\" cy=\"${point.y}\" r=\"24\" fill=\"currentColor\" fill-opacity=\".12\" stroke=\"currentColor\" stroke-opacity=\".5\"/><text x=\"${point.x}\" y=\"${point.y + 4}\" text-anchor=\"middle\" font-size=\"11\" fill=\"currentColor\">${esc(entity?.components?.place?.name ?? id).slice(0, 18)}</text></g>`
  }).join('')
  container.innerHTML = `<svg viewBox=\"0 0 ${width} ${height}\" width=\"100%\" height=\"${height}\" role=\"img\" aria-label=\"The World 地点关系图\"><title>The World 地点关系图</title>${lines}${nodes}</svg>`
}

export default { activate }
