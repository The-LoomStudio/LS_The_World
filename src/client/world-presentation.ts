import { projectCurrentWorld } from '../world-state.js'
import type { WorldStateSnapshot } from '../contracts.js'
import { classifyWeather } from './weather-classifier.js'
import { skyCssAt } from './sky-gradient.js'

const weatherLabels = { clear: '晴', rain: '雨', snow: '雪', storm: '雷雨', fog: '雾', custom: '自定义天气' }

export function describeWorldWeather(root?: WorldStateSnapshot) {
  const current = root ? projectCurrentWorld(root) : undefined
  const weather = current?.weather
  const time = current?.time?.value
  const label = weather?.label || (weather ? weatherLabels[weather.kind] : '天气未知')
  const token = weather ? weatherLabels[weather.kind] : ''
  const weatherString = !weather ? '' : weather.kind === 'custom' || label.includes(token) ? label : `${token} ${label}`
  const period = !time ? '' : time.hour >= 22 || time.hour < 4 ? '夜晚'
    : time.hour < 6 ? '日出' : time.hour < 9 ? '清晨' : time.hour < 17 ? '白天' : time.hour < 19 ? '黄昏' : '夜晚'
  const flags = classifyWeather(weatherString)
  const knownWeather = Boolean(weather && (weather.kind !== 'custom'
    || flags.cloudy || flags.fog || flags.clear || /星|银河|萤火/.test(weatherString)))
  const kind = !knownWeather ? 'unknown' : flags.storm ? 'storm'
    : flags.rain ? 'rain' : flags.snow ? 'snow' : flags.cloudy || flags.fog ? 'cloudy'
    : period.includes('夜') ? 'night' : 'clear'
  return {
    kind, weatherString, period,
    subtitle: `${period || '时间未知'} · ${label}`,
    time: time ? `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}` : '--:--',
    date: time ? `${time.year} / ${time.month} / ${time.day}` : '日期未知',
    sky: time && knownWeather ? skyCssAt(time.hour, time.minute, weatherString, period) : undefined,
  }
}
