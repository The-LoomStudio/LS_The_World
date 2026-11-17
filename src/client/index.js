import { resetSkyTheme, setSkyTheme } from './sky-gradient.js'
import { createClouds3dFX } from './clouds-3d.js'
import { createWeatherRenderer } from './weather-renderer.js'
import { mountTheWorldPanel } from './panel-view.tsx'
import { createToggleButtons } from './toggle-button.js'
import { validateWorldRoot } from '../world-state.js'
import { describeWorldWeather } from './world-presentation.js'

const WORKSPACE_SCOPE = { kind: 'workspace', key: 'workspace' }
const BACKGROUND_HOST_CSS = ':host{display:block;position:relative;width:100%;height:100%;overflow:hidden;pointer-events:none}'

function normalizePanelLayout(value) {
  if (!value || typeof value !== 'object') return undefined
  const { left, top, width, height } = value
  if (![left, top, width, height].every(item => typeof item === 'number' && Number.isFinite(item))) return undefined
  return { left, top, width, height }
}

export function activate(context) {
  context.signal.throwIfAborted()
  const target = context.timeline.target
  if (!target) throw new Error('The World requires an adopted Timeline context')
  const resourceUrl = path => context.files.url(path)
  const themeIds = new Set(['default', 'eternal_night', 'legacy'])
  const toggleButtons = createToggleButtons()
  const listeners = new Set()
  let view = { status: '正在读取世界状态', weatherEffectsEnabled: true, themeId: 'default', panelLayout: undefined }
  let themeRequest = 0
  let configRequest = 0
  let weatherEffectsCss = ''
  let activeBackground
  let disposed = false
  const handles = []

  function publish(patch) {
    if (disposed || context.signal.aborted) return
    view = { ...view, ...patch }
    for (const listener of listeners) listener()
  }

  function renderWeather() {
    if (disposed || context.signal.aborted) return
    const weather = describeWorldWeather(view.result?.state.theWorld)
    toggleButtons.update(weather.weatherString, weather.period, weather.sky ?? 'transparent')
    if (!activeBackground) return
    if (!weather.sky || !view.weatherEffectsEnabled) {
      activeBackground.skyBackdrop.style.background = 'transparent'
      activeBackground.weatherRenderer.clear()
      return
    }
    activeBackground.skyBackdrop.style.background = weather.sky
    activeBackground.weatherRenderer.update({ weatherString: weather.weatherString, periodString: weather.period })
  }

  async function applySkyTheme(themeId) {
    if (!themeIds.has(themeId)) throw new Error('Unknown The World sky theme')
    const sequence = ++themeRequest
    const response = await fetch(resourceUrl(`resources/themes/sky/${themeId}.json`), { signal: context.signal })
    if (!response.ok) throw new Error(`Theme resource request failed: ${response.status}`)
    const theme = await response.json()
    if (disposed || context.signal.aborted || sequence !== themeRequest) return
    setSkyTheme(theme)
    publish({ themeId })
    renderWeather()
  }

  function applyConfigEntries(entries, { partial = false } = {}) {
    if (disposed || context.signal.aborted) return
    configRequest += 1
    const patch = {}
    const effectsEntry = entries.find(entry => entry.key === 'weather-effects-enabled')
    if (effectsEntry !== undefined) {
      patch.weatherEffectsEnabled = typeof effectsEntry.value === 'boolean' ? effectsEntry.value : true
    } else if (!partial) {
      patch.weatherEffectsEnabled = true
    }
    const layoutEntry = entries.find(entry => entry.key === 'panel-layout')
    if (layoutEntry !== undefined) {
      patch.panelLayout = normalizePanelLayout(layoutEntry.value)
    } else if (!partial) {
      patch.panelLayout = undefined
    }
    if (Object.keys(patch).length > 0) publish(patch)

    const themeEntry = entries.find(entry => entry.key === 'sky-theme-id')
    const nextThemeId = typeof themeEntry?.value === 'string' && themeIds.has(themeEntry.value)
      ? themeEntry.value
      : (!partial ? 'default' : undefined)
    if (nextThemeId && nextThemeId !== view.themeId) {
      void applySkyTheme(nextThemeId).catch(error => {
        if (!disposed && !context.signal.aborted) context.logger.warn('The World sky theme could not be loaded', { error: String(error) })
      })
    }
    renderWeather()
  }

  function dispose() {
    if (disposed) return
    disposed = true
    context.signal.removeEventListener('abort', dispose)
    try { context.renderers.close('official.the-world.background', WORKSPACE_SCOPE) } catch { /* Host may already be tearing down. */ }
    for (const handle of handles.splice(0).reverse()) void handle.dispose()
    listeners.clear()
    toggleButtons.dispose()
    if (activeBackground) {
      activeBackground.weatherRenderer.clear()
      activeBackground.clouds.dispose()
      activeBackground = undefined
    }
    resetSkyTheme()
  }
  context.signal.addEventListener('abort', dispose, { once: true })

  const initialConfigRequest = configRequest
  void context.configs.list({ scope: { kind: 'global' } }).then(entries => {
    if (configRequest === initialConfigRequest) applyConfigEntries(entries)
  }, error => {
    if (!disposed && !context.signal.aborted) context.logger.error('The World settings could not be loaded', { error: String(error) })
  })
  void fetch(resourceUrl('resources/original/weather_effects.css'), { signal: context.signal })
    .then(response => {
      if (!response.ok) throw new Error(`Weather effects resource request failed: ${response.status}`)
      return response.text()
    })
    .then(css => {
      if (disposed || context.signal.aborted) return
      weatherEffectsCss = css
      if (activeBackground) activeBackground.particleStyle.textContent = `${BACKGROUND_HOST_CSS}\n${weatherEffectsCss}`
    })
    .catch(error => {
      if (!disposed && !context.signal.aborted) context.logger.warn('The World weather effects could not be loaded', { error: String(error) })
    })

  try {
    handles.push(context.configs.subscribe({ scope: { kind: 'global' } }, entries => applyConfigEntries(entries)))
    handles.push(context.state.subscribe(target, snapshot => {
      const root = snapshot.value.theWorld
      if (root === undefined) {
        publish({ result: undefined, status: '当前分支尚未初始化 The World' })
      } else {
        try {
          validateWorldRoot(root)
          publish({ result: { revisionId: snapshot.revisionId, state: { theWorld: root } }, status: '' })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          context.logger.warn('The World state validation failed', { error: message })
          publish({ result: undefined, status: `状态校验失败：${message}` })
        }
      }
      renderWeather()
    }, error => {
      publish({ result: undefined, status: `读取失败：${error.message}` })
      renderWeather()
    }))
    handles.push(context.renderers.register({
      id: 'official.the-world.background',
      name: 'The World 天空与天气背景',
      surface: 'shell.background',
      instanceScope: 'workspace',
      adapter: 'shadow',
      fallback: 'hidden',
    }, {
      mount(root) {
        root.replaceChildren()
        const particleStyle = document.createElement('style')
        particleStyle.textContent = weatherEffectsCss ? `${BACKGROUND_HOST_CSS}\n${weatherEffectsCss}` : BACKGROUND_HOST_CSS
        const skyBackdrop = document.createElement('div')
        skyBackdrop.style.cssText = 'position:absolute;inset:0;pointer-events:none;transition:background 0.6s ease;'
        const backgroundLayer = document.createElement('div')
        backgroundLayer.dataset.theWorldFxLayerBg = 'true'
        backgroundLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;'
        const foregroundLayer = document.createElement('div')
        foregroundLayer.dataset.theWorldFxLayer = 'true'
        foregroundLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2;'
        root.append(particleStyle, skyBackdrop, backgroundLayer, foregroundLayer)
        const clouds = createClouds3dFX(backgroundLayer, resourceUrl('assets/images/cloud.png'))
        const weatherRenderer = createWeatherRenderer({ backgroundLayer, foregroundLayer, clouds })
        const mounted = { particleStyle, skyBackdrop, weatherRenderer, clouds }
        activeBackground = mounted
        renderWeather()
        return {
          dispose() {
            if (activeBackground === mounted) activeBackground = undefined
            weatherRenderer.clear()
            clouds.dispose()
            root.replaceChildren()
          },
        }
      },
    }))
    context.renderers.open('official.the-world.background', { scope: WORKSPACE_SCOPE, replace: true })

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
            applyConfigEntries([entry], { partial: true })
          },
          async setTheme(themeId) {
            context.signal.throwIfAborted()
            await applySkyTheme(themeId)
            const entry = await context.configs.upsert({ scope: { kind: 'global' }, key: 'sky-theme-id', value: themeId })
            applyConfigEntries([entry], { partial: true })
          },
          async setPanelLayout(layout) {
            context.signal.throwIfAborted()
            const entry = await context.configs.upsert({ scope: { kind: 'global' }, key: 'panel-layout', value: layout })
            applyConfigEntries([entry], { partial: true })
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
