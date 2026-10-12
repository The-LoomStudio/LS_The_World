import { setSkyTheme } from './sky-gradient.js'
import { createClouds3dFX } from './clouds-3d.js'
import { createWeatherRenderer } from './weather-renderer.js'
import { mountTheWorldPanel } from './panel-view.tsx'
import { createToggleButtons } from './toggle-button.js'
import { validateWorldRoot } from '../world-state.js'
import { describeWorldWeather } from './world-presentation.js'

export function activate(context) {
  context.signal.throwIfAborted()
  const target = context.timeline.target
  if (!target) throw new Error('The World requires an adopted Timeline context')
  const resourceUrl = path => context.files.url(path)
  const themeIds = new Set(['default', 'eternal_night', 'legacy'])
  const toggleButtons = createToggleButtons()
  const stageHost = document.querySelector('[data-loom-component="shell-background-layer"]')
  const backgroundLayer = document.createElement('div')
  backgroundLayer.dataset.theWorldFxLayerBg = 'true'
  const foregroundLayer = document.createElement('div')
  foregroundLayer.dataset.theWorldFxLayer = 'true'
  for (const layer of [backgroundLayer, foregroundLayer]) {
    layer.style.cssText = `position:${stageHost ? 'absolute' : 'fixed'};inset:0;pointer-events:none;overflow:hidden;`
  }
  backgroundLayer.style.zIndex = '0'
  foregroundLayer.style.zIndex = '2'
  ;(stageHost ?? document.body).append(backgroundLayer, foregroundLayer)
  const clouds = createClouds3dFX(backgroundLayer, resourceUrl('assets/images/cloud.png'))
  const weatherRenderer = createWeatherRenderer({ backgroundLayer, foregroundLayer, clouds })
  const particleStyle = document.createElement('style')
  document.head.append(particleStyle)
  const listeners = new Set()
  let view = { status: '正在读取世界状态', weatherEffectsEnabled: true, themeId: 'default' }
  let themeRequest = 0
  let configRequest = 0
  let wallpaper
  let disposed = false
  const handles = []

  function publish(patch) {
    if (disposed || context.signal.aborted) return
    view = { ...view, ...patch }
    for (const listener of listeners) listener()
  }
  function releaseWallpaper() {
    if (!wallpaper) return
    const root = document.documentElement
    if (root.getAttribute('data-loom-preview-background') === 'the-world'
      && root.style.getPropertyValue('--loom-preview-wallpaper') === wallpaper.applied) {
      if (wallpaper.previous) root.style.setProperty('--loom-preview-wallpaper', wallpaper.previous)
      else root.style.removeProperty('--loom-preview-wallpaper')
      if (wallpaper.attribute === null) root.removeAttribute('data-loom-preview-background')
      else root.setAttribute('data-loom-preview-background', wallpaper.attribute)
    }
    wallpaper = undefined
  }
  function renderWeather() {
    if (disposed || context.signal.aborted) return
    const weather = describeWorldWeather(view.result?.state.theWorld)
    toggleButtons.update(weather.weatherString, weather.period, weather.sky ?? 'transparent')
    if (!weather.sky || !view.weatherEffectsEnabled) {
      releaseWallpaper()
      weatherRenderer.clear()
      return
    }
    const root = document.documentElement
    wallpaper ??= {
      previous: root.style.getPropertyValue('--loom-preview-wallpaper'),
      attribute: root.getAttribute('data-loom-preview-background'),
    }
    root.style.setProperty('--loom-preview-wallpaper', weather.sky)
    wallpaper.applied = root.style.getPropertyValue('--loom-preview-wallpaper')
    root.setAttribute('data-loom-preview-background', 'the-world')
    weatherRenderer.update({ weatherString: weather.weatherString, periodString: weather.period })
  }
  function dispose() {
    if (disposed) return
    disposed = true
    context.signal.removeEventListener('abort', dispose)
    for (const handle of handles.splice(0).reverse()) void handle.dispose()
    listeners.clear()
    toggleButtons.dispose()
    weatherRenderer.clear()
    clouds.dispose()
    backgroundLayer.remove()
    foregroundLayer.remove()
    particleStyle.remove()
    releaseWallpaper()
  }
  context.signal.addEventListener('abort', dispose, { once: true })

  function applyConfig(entries) {
    if (disposed || context.signal.aborted) return
    configRequest += 1
    const effects = entries.find(entry => entry.key === 'weather-effects-enabled')?.value
    publish({ weatherEffectsEnabled: typeof effects === 'boolean' ? effects : true })
    renderWeather()
  }
  const initialConfigRequest = configRequest
  void context.configs.list({ scope: { kind: 'global' } }).then(entries => {
    if (configRequest === initialConfigRequest) applyConfig(entries)
  }, error => {
    if (!disposed && !context.signal.aborted) context.logger.error('The World settings could not be loaded', { error: String(error) })
  })
  void fetch(resourceUrl('resources/original/weather_effects.css'), { signal: context.signal })
    .then(response => {
      if (!response.ok) throw new Error(`Weather effects resource request failed: ${response.status}`)
      return response.text()
    })
    .then(css => { if (!disposed && !context.signal.aborted) particleStyle.textContent = css })
    .catch(error => {
      if (!disposed && !context.signal.aborted) context.logger.warn('The World weather effects could not be loaded', { error: String(error) })
    })

  try {
    handles.push(context.configs.subscribe({ scope: { kind: 'global' } }, applyConfig))
    handles.push(context.state.subscribe(target, snapshot => {
      const root = snapshot.value.theWorld
      if (root === undefined) {
        publish({ result: undefined, status: '当前分支尚未初始化 The World' })
      } else {
        validateWorldRoot(root)
        publish({ result: { revisionId: snapshot.revisionId, state: { theWorld: root } }, status: '' })
      }
      renderWeather()
    }, error => {
      publish({ result: undefined, status: `读取失败：${error.message}` })
      renderWeather()
    }))
    handles.push(context.renderers.register({
      id: 'official.the-world.debugger',
      name: 'The World 调试台',
      surface: 'shell.focus-surface',
      instanceScope: 'workspace',
      adapter: 'shadow',
      fallback: 'hidden',
    }, {
      mount(root, rendererContext) {
        return mountTheWorldPanel(root, { target, close: rendererContext.close }, {
          getSnapshot: () => view,
          subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
          async setWeatherEffectsEnabled(enabled) {
            context.signal.throwIfAborted()
            const entry = await context.configs.upsert({ scope: { kind: 'global' }, key: 'weather-effects-enabled', value: enabled })
            applyConfig([entry])
          },
          async setTheme(themeId) {
            if (!themeIds.has(themeId)) throw new Error('Unknown The World sky theme')
            const sequence = ++themeRequest
            const response = await fetch(resourceUrl(`resources/themes/sky/${themeId}.json`), { signal: context.signal })
            if (!response.ok) throw new Error(`Theme resource request failed: ${response.status}`)
            const theme = await response.json()
            if (disposed || context.signal.aborted || sequence !== themeRequest) return
            setSkyTheme(theme)
            publish({ themeId })
            renderWeather()
          },
        })
      },
    }))
    handles.push(context.commands.register('official.the-world.open-panel', () => {
      context.renderers.open('official.the-world.debugger', { replace: true })
    }))
  } catch (error) {
    dispose()
    throw error
  }
  return { dispose }
}

export default { activate }
