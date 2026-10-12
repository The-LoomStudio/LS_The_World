import baseCss from './original/toggle_button_base.css'
import effectsCss from './original/toggle_button_effects.css'

// ST modules/core/ThemeManager.js:updateToggleButtonIcon.
// Keep the original branch order, class names, DOM and particle counts.
export function toggleButtonScene(weather, period) {
  const clouds = '<div class="cloud cloud-back"></div><div class="cloud cloud-mid"></div><div class="cloud cloud-front"></div>'
  const particles = count => `<ul>${'<li></li>'.repeat(count)}</ul>`
  if (weather.includes('雷')) return ['weather-thunderstorm', clouds + particles(5)]
  if (weather.includes('雨')) return [period.includes('夜') ? 'weather-rainy-night' : 'weather-rainy', clouds + particles(5)]
  if (weather.includes('雪')) return ['weather-snowy', clouds + '<span class="snowe"></span><span class="snowex"></span><span class="stick"></span><span class="stick2"></span>' + particles(8)]
  if (weather.includes('云') || weather.includes('阴')) {
    return period.includes('夜') ? ['weather-night-cloudy', '<span class="moon"></span>' + clouds] : ['weather-cloudy', clouds]
  }
  if (period.includes('日出') || period.includes('日落')) return ['weather-sunrise-sunset', '<div class="horizon-line horizon-1"></div><div class="horizon-line horizon-2"></div><div class="horizon-line horizon-3"></div><div class="sun-disk"></div>']
  if (weather.includes('晴') || weather.includes('星空')) {
    return period.includes('夜') ? ['weather-night-clear', '<span class="moon"></span>' + particles(5)] : ['weather-sunny', '<span class="sun"></span>']
  }
  if (weather.includes('樱')) return ['weather-sakura', particles(8)]
  if (weather.includes('萤火')) return ['weather-fireflies', particles(5)]
  return ['default', '']
}

export function createToggleButtons(doc = document) {
  const instances = new Map()
  let current

  function paint(instance) {
    if (!current) return
    const [weatherClass, html] = toggleButtonScene(current.weather, current.period)
    const { button, layers } = instance
    if (instance.weatherClass !== weatherClass) {
      for (const child of [...button.childNodes]) if (!layers.includes(child)) child.remove()
      button.className = `has-ripple ${weatherClass === 'default' ? '' : weatherClass}`
      button.style.fontSize = weatherClass === 'default' ? '20px' : '5px'
      // Only constant markup from toggleButtonScene enters HTML, never state strings.
      if (html) button.insertAdjacentHTML('beforeend', html)
      instance.weatherClass = weatherClass
    }
    if (instance.background !== current.background) {
      const next = 1 - instance.active
      layers[next].style.background = current.background
      layers[next].style.opacity = '1'
      layers[instance.active].style.opacity = '0'
      instance.active = next
      instance.background = current.background
    }
  }

  function reconcile() {
    for (const [host] of instances) if (!host.isConnected) instances.delete(host)
    for (const host of doc.querySelectorAll('[data-the-world-toggle]')) {
      if (instances.has(host)) continue
      const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
      const style = doc.createElement('style')
      // Only positioning changes: the shell owns the Header placement and click.
      style.textContent = `${baseCss}\n${effectsCss}\n:host{display:block;position:absolute;inset:0;width:40px;height:40px;overflow:hidden;pointer-events:none}#the_world-toggle-btn{position:absolute;inset:0;top:auto;right:auto;width:40px;height:40px;z-index:auto;cursor:inherit;box-sizing:border-box;border-radius:50%;overflow:hidden}`
      const button = doc.createElement('div')
      button.id = 'the_world-toggle-btn'
      const layers = [1, 2].map(n => {
        const layer = doc.createElement('div')
        layer.className = `tw-bg-layer-${n}`
        layer.style.opacity = n === 1 ? '1' : '0'
        button.append(layer)
        return layer
      })
      root.replaceChildren(style, button)
      const instance = { button, layers, active: 0 }
      instances.set(host, instance)
      paint(instance)
    }
  }

  const observer = new MutationObserver(reconcile)
  observer.observe(doc.body, { childList: true, subtree: true })
  reconcile()
  return {
    update(weather, period, background) {
      current = { weather, period, background }
      for (const instance of instances.values()) paint(instance)
    },
    dispose() {
      observer.disconnect()
      for (const host of instances.keys()) host.shadowRoot.replaceChildren()
      instances.clear()
    },
  }
}
