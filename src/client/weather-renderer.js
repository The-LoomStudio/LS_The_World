import { classifyWeather } from './weather-classifier.js'

export function createWeatherRenderer({ backgroundLayer, foregroundLayer, clouds }) {
  let particleInterval = 0
  let lightningTimeout = 0
  let milkyWayTimeout = 0
  let windInterval = 0
  let currentParticle = ''
  const timeouts = new Set()

  function schedule(callback, delay) {
    const id = window.setTimeout(() => { timeouts.delete(id); callback() }, delay)
    timeouts.add(id)
    return id
  }
  function cancelTimeout(id) {
    window.clearTimeout(id)
    timeouts.delete(id)
  }

  function update({ weatherString = '', periodString = '', seasonString = '', enabled = true, highPerformance = true }) {
    const flags = classifyWeather(weatherString)
    const density = weatherDensity(weatherString)
    const night = periodString.includes('夜')
    const goodWeather = !/[雨雪雷]/.test(weatherString)
    const milkyWay = night && goodWeather && weatherString.includes('银河')
    const stars = night && goodWeather && weatherString.includes('星') && !milkyWay
    const fireflies = night && weatherString.includes('萤火')

    if (enabled && highPerformance && flags.cloudy) {
      clouds.activate({ density, period: periodString, weather: weatherString })
      clouds.setColor(cloudFilter(periodString, weatherString))
    } else clouds.deactivate()

    manageStatic(backgroundLayer, 'star', enabled && stars, 96, createStar)
    manageMilkyWay(enabled && highPerformance && milkyWay)
    manageStatic(foregroundLayer, 'firefly', enabled && fireflies, Math.max(8, Math.round(12 * density.count)), createFirefly)
    manageStatic(foregroundLayer, 'fog-layer', enabled && flags.fog, 5, createFog)
    manageParticles(enabled ? (flags.rain ? 'rain' : flags.snow ? 'snow' : '') : '', density)
    manageWind(enabled && density.wind > 0 && (flags.rain || (!flags.snow && !flags.cloudy)), density.wind, seasonString)
    manageLightning(enabled && flags.storm)
  }

  function manageParticles(type, density) {
    if (currentParticle === type && particleInterval) return
    clearInterval(particleInterval)
    particleInterval = 0
    currentParticle = type
    foregroundLayer.querySelectorAll('.particle-wrapper,.leaf').forEach(node => node.remove())
    if (!type) return
    const targetCount = Math.round(type === 'rain' ? 18 + density.count * 16 : 24 + density.count * 18)
    const interval = Math.max(120, (type === 'rain' ? 260 : 220) / density.speed)
    const generate = () => {
      const count = foregroundLayer.querySelectorAll(`.particle-${type}`).length
      const batch = Math.max(1, Math.min(8, Math.ceil(targetCount / 6)))
      for (let index = count; index < Math.min(targetCount, count + batch); index++) foregroundLayer.append(createParticle(type, density, schedule))
    }
    generate()
    particleInterval = window.setInterval(generate, interval)
  }

  function manageStatic(target, className, visible, count, creator) {
    const existing = target.querySelectorAll(`:scope > .${className}`)
    if (!visible) {
      existing.forEach(node => node.remove())
      return
    }
    if (existing.length > 0) return
    const fragment = document.createDocumentFragment()
    for (let index = 0; index < count; index++) fragment.append(creator())
    target.append(fragment)
  }

  function manageMilkyWay(visible) {
    const existing = backgroundLayer.querySelector(':scope > .milky-way-container')
    if (!visible) {
      cancelTimeout(milkyWayTimeout)
      milkyWayTimeout = 0
      existing?.remove()
      return
    }
    if (existing) return
    const container = createMilkyWay()
    backgroundLayer.append(container)
    milkyWayTimeout = schedule(() => {
      container.classList.add('fading-out')
      schedule(() => container.remove(), 3000)
    }, 15000)
  }

  function manageWind(active, strength) {
    if (!active) {
      clearInterval(windInterval)
      windInterval = 0
      foregroundLayer.style.removeProperty('--tw-gust-x')
      return
    }
    if (windInterval) return
    const pulse = () => {
      const gust = Math.max(.35, strength) * (.55 + Math.random() * .9)
      foregroundLayer.style.setProperty('--tw-gust-x', `${gust * 12}vw`)
      schedule(() => foregroundLayer.style.setProperty('--tw-gust-x', '0vw'), 900)
    }
    pulse()
    windInterval = window.setInterval(pulse, 2200)
  }

  function manageLightning(active) {
    cancelTimeout(lightningTimeout)
    lightningTimeout = 0
    foregroundLayer.querySelectorAll('.effect-thunder,.lightning-strike-svg').forEach(node => node.remove())
    foregroundLayer.classList.remove('lightning-flash')
    if (!active) return
    foregroundLayer.append(Object.assign(document.createElement('div'), { className: 'effect-thunder' }))
    const strike = () => {
      createLightningStrike(foregroundLayer, schedule)
      lightningTimeout = schedule(strike, 25000 + Math.random() * 5000)
    }
    strike()
  }

  function clear() {
    clearInterval(particleInterval)
    clearInterval(windInterval)
    for (const id of timeouts) window.clearTimeout(id)
    timeouts.clear()
    particleInterval = lightningTimeout = milkyWayTimeout = windInterval = 0
    currentParticle = ''
    backgroundLayer.replaceChildren()
    foregroundLayer.replaceChildren()
    foregroundLayer.classList.remove('lightning-flash')
    foregroundLayer.style.removeProperty('--tw-gust-x')
    clouds.deactivate()
  }

  return { update, clear }
}

function cloudFilter(period, weather) {
  if (/雨|雷|暴/.test(weather)) return period.includes('夜') ? 'brightness(.15) contrast(1.3) grayscale(.8)' : 'brightness(.6) contrast(.9) saturate(.7) grayscale(.4)'
  if (weather.includes('雪')) return 'brightness(.8) contrast(.9) grayscale(.3)'
  if (weather.includes('阴')) return 'brightness(.7) contrast(.9) grayscale(.4)'
  if (period.includes('夜')) return 'brightness(.25) contrast(1.2) grayscale(.7)'
  if (/日出|日落|清晨/.test(period)) return 'sepia(.6) hue-rotate(-30deg) saturate(1.6) brightness(.9)'
  if (period.includes('黄昏')) return 'brightness(.5) contrast(1) saturate(.9) grayscale(.4)'
  return 'brightness(1)'
}

export function weatherDensity(weatherString = '') {
  const density = { count: 1, speed: 1, wind: -1 }
  if (/暴|阴/.test(weatherString)) Object.assign(density, { count: 5, speed: 2 })
  else if (/大|强|多云/.test(weatherString)) Object.assign(density, { count: 3, speed: 1.5 })
  else if (weatherString.includes('中')) Object.assign(density, { count: 2, speed: 1 })
  else if (/小|微|少云/.test(weatherString)) Object.assign(density, { count: .5, speed: .8 })
  else if (weatherString.includes('无云')) Object.assign(density, { count: 0, speed: 0 })
  if (weatherString.includes('风')) density.wind = /狂|暴/.test(weatherString) ? 2 : /大|强/.test(weatherString) ? 1.5 : .8
  return density
}

function createParticle(type, density, schedule) {
  const windy = density.wind > 0
  const wrapper = document.createElement('i')
  wrapper.className = `particle-wrapper particle-${type}`
  wrapper.style.left = windy ? `${Math.random() * 150 - 50}%` : `${Math.random() * 110 - 5}%`
  const durationSeconds = type === 'rain' ? (.4 + Math.random() * .4) / density.speed : (10 + Math.random() * 10) / density.speed
  wrapper.style.animationDuration = `${durationSeconds}s`
  wrapper.style.animationDelay = `-${Math.random() * durationSeconds}s`
  wrapper.style.setProperty('--tw-curve-a', (.18 + Math.random() * .52).toFixed(3))
  wrapper.style.setProperty('--tw-curve-b', (.12 + Math.random() * .46).toFixed(3))
  wrapper.style.setProperty('--tw-curve-c', (.08 + Math.random() * .34).toFixed(3))
  if (type === 'rain') {
    const drop = document.createElement('i')
    drop.className = `raindrop${windy ? density.wind >= 1.5 ? ' slanted-strong' : ' slanted-light' : ''}`
    drop.style.opacity = String(Math.random() * .6 + .2)
    drop.style.transform = windy ? `rotate(${density.wind >= 1.5 ? -25 : -15}deg)` : 'rotate(0deg)'
    wrapper.classList.toggle('angled-strong', density.wind >= 1.5)
    wrapper.classList.toggle('angled-light', windy && density.wind < 1.5)
    wrapper.append(drop)
  } else {
    const flake = document.createElement('i')
    const size = `${2 + Math.random() * 3}px`
    flake.className = 'snowflake'
    flake.style.cssText = `width:${size};height:${size};opacity:${.5 + Math.random() * .5}`
    wrapper.classList.toggle('snow-drift-strong', density.wind >= 1.5)
    wrapper.classList.toggle('snow-drift-light', windy && density.wind < 1.5)
    wrapper.append(flake)
  }
  const duration = durationSeconds * 1000 + 250
  wrapper.addEventListener('animationend', event => { if (event.target === wrapper) wrapper.remove() }, { once: true })
  schedule(() => wrapper.remove(), duration)
  return wrapper
}

function createStar() {
  const colors = ['#280F36', '#632B6C', '#BE6590', '#FFC1A0', '#FE9C7F']
  const random = Math.random()
  const star = document.createElement('i')
  star.className = `star${random >= .4 ? ' blink' : ''}`
  const size = random < .6 ? .5 + Math.random() * 1.5 : random < .8 ? 2 + Math.random() : 1 + Math.random()
  star.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${2 + Math.random() * 6}s;animation-delay:${Math.random() * 6}s;opacity:${.4 + Math.random() * .6}`
  if (random >= .8) {
    const color = colors[Math.floor(Math.random() * colors.length)]
    star.style.backgroundColor = color
    star.style.boxShadow = `0 0 6px 1px ${colors[Math.floor(Math.random() * colors.length)]}`
  }
  return star
}

function createFirefly() {
  const node = document.createElement('i')
  const size = 2 + Math.random() * 2
  node.className = 'firefly'
  node.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-duration:${4 + Math.random() * 4}s;animation-delay:${Math.random() * 8}s`
  return node
}

function createFog() {
  const node = document.createElement('i')
  node.className = 'fog-layer'
  node.style.cssText = `animation-duration:${20 + Math.random() * 15}s;animation-delay:${Math.random() * 5}s;opacity:${Math.random() * .2 + .1}`
  return node
}

function createMilkyWay() {
  const container = document.createElement('div')
  container.className = 'milky-way-container'
  const stars = document.createElement('div')
  stars.className = 'stars'
  const cross = document.createElement('div')
  cross.className = 'stars-cross'
  const auxiliary = document.createElement('div')
  auxiliary.className = 'stars-cross-aux'
  for (let index = 0; index < 420; index++) stars.append(createMilkyStar(Math.floor(Math.random() * 3)))
  for (let index = 0; index < 90; index++) stars.append(createMilkyStar(3 + Math.floor(Math.random() * 2)))
  for (let index = 0; index < 54; index++) cross.append(createNebula(), createMilkyStar(1, true))
  for (let index = 0; index < 20; index++) auxiliary.append(createNebula(), createMilkyStar(2, true))
  container.append(stars, cross, auxiliary)
  return container
}

function createMilkyStar(size, colored = false) {
  const colors = ['#280F36', '#632B6C', '#BE6590', '#FFC1A0', '#FE9C7F']
  const node = document.createElement('i')
  node.className = `star star-${size}${Math.random() < .08 ? ' blink' : ''}`
  node.style.cssText = `top:${Math.random() * 100}%;left:${Math.random() * 100}%;animation-duration:${2 + Math.random() * 8}s`
  if (colored) {
    node.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    node.style.boxShadow = `0 0 6px 1px ${colors[Math.floor(Math.random() * colors.length)]}`
  }
  return node
}

function createNebula() {
  const colors = ['#280F36', '#632B6C', '#BE6590', '#FFC1A0', '#FE9C7F']
  const node = document.createElement('i')
  node.className = 'nebula-milky-way'
  node.style.cssText = `top:${Math.random() * 100}%;left:${Math.random() * 100}%;background-color:${colors[Math.floor(Math.random() * colors.length)]}`
  return node
}

function createLightningStrike(container, schedule) {
  container.classList.add('lightning-flash')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'lightning-strike-svg')
  svg.setAttribute('viewBox', `0 0 ${container.clientWidth || innerWidth} ${container.clientHeight || innerHeight}`)
  svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('class', 'lightning-strike-path')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'rgba(255,255,255,.85)')
  const width = container.clientWidth || innerWidth
  const height = container.clientHeight || innerHeight
  let x = width * .2 + Math.random() * width * .6
  let points = `M${x},0`
  for (let index = 0; index < 10; index++) {
    x += Math.random() * height * .15 - height * .075
    points += ` L${x},${height / 10 * (index + 1)}`
  }
  path.setAttribute('d', points)
  path.style.strokeWidth = `${1 + Math.random()}px`
  svg.append(path)
  container.append(svg)
  schedule(() => { svg.remove(); container.classList.remove('lightning-flash') }, 500)
}
