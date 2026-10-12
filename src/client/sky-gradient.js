let gradients = [
  { hour: 0, colors: ['#00000c', '#00000c'], brightness: 'dark' },
  { hour: 4, colors: ['#20202c', '#515175'], brightness: 'dark' },
  { hour: 6, colors: ['#4a4969', '#cd82a0'], brightness: 'dark' },
  { hour: 8, colors: ['#82addb', '#ebb2b1'], brightness: 'light' },
  { hour: 11, colors: ['#9be2fe', '#67d1fb'], brightness: 'light' },
  { hour: 12, colors: ['#90dffe', '#38a3d1'], brightness: 'light' },
  { hour: 16, colors: ['#2473ab', '#5b7983'], brightness: 'dark' },
  { hour: 17, colors: ['#1c4f82', '#d8a24c'], brightness: 'dark' },
  { hour: 18.5, colors: ['#163C52', '#B7490F'], brightness: 'dark' },
  { hour: 19, colors: ['#00000c', '#150800'], brightness: 'dark' },
  { hour: 24, colors: ['#00000c', '#00000c'], brightness: 'dark' },
]
let periodOverrides = {}

export function setSkyTheme(theme) {
  if (!Array.isArray(theme?.gradients) || theme.gradients.length === 0) return false
  gradients = theme.gradients
    .map(point => ({ hour: Number(point.hour), colors: point.colors?.slice(0, 2), brightness: point.brightness }))
    .filter(point => Number.isFinite(point.hour) && point.colors?.length === 2 && point.colors.every(Boolean))
    .sort((a, b) => a.hour - b.hour)
  periodOverrides = theme.periodOverrides ?? {}
  return gradients.length > 0
}

export function skyThemeFor({ timeString, weatherString = '', periodString = '' }) {
  if (gradients.length === 0) return { background: 'linear-gradient(#555, #222)', brightness: 'dark', period: '未知' }
  const decimalHour = parseTimeToDecimal(timeString)
  const badWeather = /雨|雪|阴|雷/.test(weatherString)
  if (decimalHour != null) {
    const period = periodString || derivePeriod(decimalHour)
    if (badWeather) {
      const themes = {
        夜晚: { colors: ['#1a1a1a', '#0a0a0a'], brightness: 'dark' },
        黄昏: { colors: ['#3a3a5a', '#2a2a3a'], brightness: 'dark' },
        日落: { colors: ['#3a3a5a', '#2a2a3a'], brightness: 'dark' },
        日出: { colors: ['#3a3a5a', '#2a2a3a'], brightness: 'dark' },
        黎明: { colors: ['#3a3a5a', '#2a2a3a'], brightness: 'dark' },
        清晨: { colors: ['#3a3a5a', '#2a2a3a'], brightness: 'dark' },
        白天: { colors: ['#6c757d', '#495057'], brightness: 'dark' },
      }
      return themeResult(themes[period] ?? themes.白天, period)
    }
    const hour = ((decimalHour % 24) + 24) % 24
    const extended = [...gradients]
    const first = gradients[0]
    if (first.hour === 0 && !gradients.some(point => point.hour === 24)) extended.push({ ...first, hour: 24 })
    let start = extended.at(-1) ?? first
    let end = start
    for (let index = 0; index < extended.length - 1; index++) {
      if (hour >= extended[index].hour && hour < extended[index + 1].hour) {
        start = extended[index]
        end = extended[index + 1]
        break
      }
    }
    const span = end.hour - start.hour
    const factor = span > 0 ? (hour - start.hour) / span : 0
    return {
      background: `linear-gradient(160deg, ${mix(start.colors[0], end.colors[0], factor)}, ${mix(start.colors[1], end.colors[1], factor)})`,
      brightness: start.brightness,
      period,
    }
  }
  const period = periodString || '白天'
  const override = periodOverrides[period] ?? (badWeather ? periodOverrides.默认恶劣天气 : null)
  if (override) return themeResult(override, period)
  return themeResult(gradients.find(point => point.hour === 12) ?? gradients[0], period)
}

export function skyCssAt(hour, minute = 0, weatherString = '', periodString = '') {
  return skyThemeFor({ timeString: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, weatherString, periodString }).background
}


function themeResult(theme, period) {
  return { background: `linear-gradient(160deg, ${theme.colors[0]}, ${theme.colors[1]})`, brightness: theme.brightness, period }
}

function parseTimeToDecimal(value) {
  if (!value) return null
  const match = String(value).match(/(\d{1,2}):(\d{2})/)
  if (match) return Number(match[1]) + Number(match[2]) / 60
  const periods = {
    子时: 23.5, 丑时: 1.5, 寅时: 3.5, 卯时: 5.5, 辰时: 7.5, 巳时: 9.5,
    午时: 11.5, 未时: 13.5, 申时: 15.5, 酉时: 17.5, 戌时: 19.5, 亥时: 21.5,
    午夜: 0, 深夜: 2, 黎明: 5, 清晨: 6, 日出: 6.5, 早上: 8, 上午: 10,
    中午: 12, 正午: 12, 下午: 15, 黄昏: 18, 日落: 18.5, 傍晚: 19,
    晚上: 21, 夜晚: 22, 白天: 12,
  }
  for (const [period, hour] of Object.entries(periods)) if (String(value).includes(period)) return hour
  return null
}

function derivePeriod(hour) {
  if (hour >= 22 || hour < 4) return '夜晚'
  if (hour < 6) return '日出'
  if (hour < 9) return '清晨'
  if (hour < 17) return '白天'
  if (hour < 19) return '黄昏'
  return '夜晚'
}

function mix(first, second, factor) {
  const a = hex(first), b = hex(second)
  return `#${a.map((channel, index) => Math.round(channel + factor * (b[index] - channel)).toString(16).padStart(2, '0')).join('')}`
}

function hex(value) {
  const raw = value.replace('#', '')
  return [0, 2, 4].map(index => Number.parseInt(raw.slice(index, index + 2), 16))
}
