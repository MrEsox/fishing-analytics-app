import { db } from '@/infrastructure/db/db.js'
import { getWeatherData } from '@/services/weatherService.js'

const sessionRepository = {

  async startSession(userId, lat = 33.5731, lon = -7.5898) {

    if (!userId || typeof userId !== 'string') {
      return null
    }

    const existing = await db.sessions
      .where('[user_id+status]')
      .equals([userId, 'active'])
      .first()

    if (existing) return existing

    const weather = await getWeatherData(lat, lon)

    const id = await db.sessions.add({
      client_uuid: crypto.randomUUID(),
      remote_id: null,
      user_id: userId,
      spot_id: null,
      start_time: new Date(),
      end_time: null,
      total_catches: 0,
      status: 'active',

      temp_day_min: weather.day.temp_day_min,
      temp_day_max: weather.day.temp_day_max,
      pressure_day_min: weather.day.pressure_day_min,
      pressure_day_max: weather.day.pressure_day_max,
      wind_day_max: weather.day.wind_day_max,

      temp_current: weather.snapshot.temp_current,
      pressure_current: weather.snapshot.pressure_current,
      pressure_trend_3h: weather.snapshot.pressure_trend_3h,
      wind_speed_current: weather.snapshot.wind_speed_current,
      wind_speed_trend_3h: weather.snapshot.wind_speed_trend_3h,
      wind_direction_current: weather.snapshot.wind_direction_current,
      wind_gust_current: weather.snapshot.wind_gust_current,
      weather_timestamp: weather.snapshot.weather_timestamp,

      updated_at: new Date()
    })

    await db.sync_queue.add({
      entity_type: 'session',
      entity_local_id: id,
      action: 'CREATE',
      status: 'pending',
      retries: 0,
      created_at: new Date()
    })

    return await db.sessions.get(id)
  },

  async endSession(sessionId) {

    if (!sessionId || isNaN(Number(sessionId))) return

    const catchesCount = await db.catches
      .where('session_id')
      .equals(Number(sessionId))
      .count()

    await db.sessions.update(sessionId, {
      end_time: new Date(),
      total_catches: catchesCount,
      status: 'completed',
      updated_at: new Date()
    })

    await db.sync_queue.add({
      entity_type: 'session',
      entity_local_id: sessionId,
      action: 'UPDATE',
      status: 'pending',
      retries: 0,
      created_at: new Date()
    })
  },

  async getActiveSession(userId) {

    if (!userId || typeof userId !== 'string') {
      return null
    }

    return await db.sessions
      .where('[user_id+status]')
      .equals([userId, 'active'])
      .first()
  },

  async getById(id) {
    if (!id) return null
    return await db.sessions.get(id)
  },

  async getAllByUser(userId) {
    if (!userId) return []
    return await db.sessions
      .where('user_id')
      .equals(userId)
      .toArray()
  }
}

export default sessionRepository
