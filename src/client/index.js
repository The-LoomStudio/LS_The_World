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
      const relations = document.createElement('section')
      relations.style.cssText = 'display:grid;gap:6px;'
      const relationsTitle = document.createElement('h3')
      relationsTitle.textContent = '地点关系'
      relationsTitle.style.margin = '0'
      relations.append(relationsTitle)
      const render = result => {
        const world = result?.state?.theWorld
        const list = world && world.entities && typeof world.entities === 'object' ? Object.entries(world.entities) : []
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
      root.append(title, form, status, summary, relations, entities, pre)
    },
  })
  return { dispose() { void renderer.dispose(); void background.dispose() } }
}

export default { activate }
