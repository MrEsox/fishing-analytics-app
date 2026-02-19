import { db } from '@/infrastructure/db/db.js'
import { calculateAzimuth, calculateWindIncidence } from '@/core/utils/geo.js'
import { getWeatherData } from '@/services/weatherService.js'

const catchRepository = {

  async addCatch(session) {

    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported')
    }

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject)
    })

    const { latitude, longitude } = position.coords

    const spotLat = 33.5731
    const spotLon = -7.5898

    const azimuth = calculateAzimuth(
      spotLat,
      spotLon,
      latitude,
      longitude
    )

    const windIncidenceScore = calculateWindIncidence(
      session.wind_direction_current,
      azimuth
    )

    const weather = await getWeatherData(latitude, longitude)

    const id = await db.catches.add({
      client_uuid: crypto.randomUUID(),
      remote_id: null,
      session_id: Number(session.id),
      species: 'unknown',
      weight: null,
      length: null,
      catch_time: new Date(),
      latitude: Number(latitude),
      longitude: Number(longitude),

      /* WEATHER AT CATCH */
      temp_current: weather.snapshot.temp_current,
      pressure_current: weather.snapshot.pressure_current,
      pressure_trend_3h: weather.snapshot.pressure_trend_3h,
      wind_speed_current: weather.snapshot.wind_speed_current,
      wind_speed_trend_3h: weather.snapshot.wind_speed_trend_3h,
      wind_direction_current: weather.snapshot.wind_direction_current,
      wind_gust_current: weather.snapshot.wind_gust_current,
      weather_timestamp: weather.snapshot.weather_timestamp,

      wind_incidence_score: Number(windIncidenceScore),
      updated_at: new Date()
    })

    await db.sync_queue.add({
      entity_type: 'catch',
      entity_local_id: id,
      action: 'CREATE',
      status: 'pending',
      retries: 0,
      created_at: new Date()
    })

    return id
  }
}

export default catchRepository
