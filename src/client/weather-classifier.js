/** The World weather token classification, aligned with ST WeatherSystem. */
export function classifyWeather(weather = '') {
  const value = String(weather)
  const rain = value.includes('雨') && !/无雨|停雨|雨停|不下雨/.test(value) && !value.includes('雪')
  const snow = value.includes('雪')
  const storm = value.includes('雷')
  const fog = value.includes('雾')
  const cloudy = (value.includes('云') && !value.includes('无云')) || value.includes('阴') || rain || snow || storm
  const wind = /风|大风|狂风|暴风/.test(value)
  return { rain, snow, storm, fog, cloudy, wind, clear: value.includes('晴') && !cloudy && !fog }
}
