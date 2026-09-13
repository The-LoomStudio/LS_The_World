const glyphs = { clear: '☀️', rain: '🌧️', snow: '❄️', storm: '⛈️', fog: '🌫️', custom: '✨' }

export function createWeatherEffectController(root) {
  let current = null
  return {
    set(kind = 'clear', intensity = 0.5) {
      const normalized = Math.max(0, Math.min(1, Number(intensity) || 0))
      if (current?.kind === kind && current.intensity === normalized) return false
      current = { kind, intensity: normalized }
      root.dataset.theWorldWeather = kind
      root.style.setProperty('--the-world-weather-intensity', String(normalized))
      root.textContent = `${glyphs[kind] ?? glyphs.custom} ${kind}`
      return true
    },
    clear() {
      if (!current) return false
      current = null
      delete root.dataset.theWorldWeather
      root.style.removeProperty('--the-world-weather-intensity')
      root.textContent = ''
      return true
    },
    current() { return current ? { ...current } : null },
  }
}
