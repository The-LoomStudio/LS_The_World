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
      root.style.cssText = 'display:grid;gap:12px;padding:20px;color:inherit;font:inherit;overflow:auto;'
      const title = document.createElement('h2')
      title.textContent = 'The World 调试台'
      title.style.margin = '0'
      const form = document.createElement('form')
      form.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:8px;'
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
      const pre = document.createElement('pre')
      pre.style.cssText = 'margin:0;white-space:pre-wrap;overflow:auto;font:12px/1.5 ui-monospace,monospace;'
      form.addEventListener('submit', event => {
        event.preventDefault()
        submit.disabled = true
        status.textContent = '正在读取…'
        void context.rpc.call('official.the-world.readWorldState', { timelineId: timeline.value.trim(), branchId: branch.value.trim() }).then(result => {
          status.textContent = '读取成功'
          pre.textContent = JSON.stringify(result, null, 2)
        }).catch(error => {
          status.textContent = '读取失败'
          pre.textContent = error instanceof Error ? error.message : String(error)
        }).finally(() => { submit.disabled = false })
      })
      root.append(title, form, status, pre)
    },
  })
  return { dispose() { void renderer.dispose(); void background.dispose() } }
}

export default { activate }
