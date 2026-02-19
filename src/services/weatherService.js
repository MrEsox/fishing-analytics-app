export async function getWeatherData(lat, lon) {

  const url = `
    https://api.open-meteo.com/v1/forecast
    ?latitude=${lat}
    &longitude=${lon}
    &hourly=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m
    &daily=temperature_2m_min,temperature_2m_max,pressure_msl_min,pressure_msl_max,wind_speed_10m_max
    &current_weather=true
    &timezone=auto
  `

  const response = await fetch(url.replace(/\s/g, ''))
  const data = await response.json()

  if (!data.hourly || !data.daily) {
    throw new Error('Weather API response invalid')
  }

  const hourly = data.hourly
  const now = new Date()

  /* =========================
     FIND CLOSEST HOUR INDEX
  ========================= */

  const hourlyTimes = hourly.time.map(t => new Date(t).getTime())
  const nowTime = now.getTime()

  let nowIndex = 0
  let minDiff = Infinity

  for (let i = 0; i < hourlyTimes.length; i++) {
    const diff = Math.abs(hourlyTimes[i] - nowTime)
    if (diff < minDiff) {
      minDiff = diff
      nowIndex = i
    }
  }

  /* =========================
     DAILY CONTEXT
  ========================= */

  const day = {
    temp_day_min: data.daily.temperature_2m_min[0],
    temp_day_max: data.daily.temperature_2m_max[0],
    pressure_day_min: data.daily.pressure_msl_min?.[0] ?? null,
    pressure_day_max: data.daily.pressure_msl_max?.[0] ?? null,
    wind_day_max: data.daily.wind_speed_10m_max?.[0] ?? null
  }

  /* =========================
     SNAPSHOT
  ========================= */

  const snapshot = {
    temp_current: hourly.temperature_2m[nowIndex],
    pressure_current: hourly.pressure_msl[nowIndex],
    wind_speed_current: hourly.wind_speed_10m[nowIndex],
    wind_direction_current: hourly.wind_direction_10m[nowIndex],
    wind_gust_current: hourly.wind_gusts_10m[nowIndex],
    weather_timestamp: hourly.time[nowIndex]
  }

  /* =========================
     TRENDS (3H)
  ========================= */

  let pressure_trend_3h = 0
  let wind_speed_trend_3h = 0

  if (nowIndex >= 3) {
    pressure_trend_3h =
      snapshot.pressure_current - hourly.pressure_msl[nowIndex - 3]

    wind_speed_trend_3h =
      snapshot.wind_speed_current - hourly.wind_speed_10m[nowIndex - 3]
  }

  snapshot.pressure_trend_3h = pressure_trend_3h
  snapshot.wind_speed_trend_3h = wind_speed_trend_3h

  return {
    day,
    snapshot
  }
}
