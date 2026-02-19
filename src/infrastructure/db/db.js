import Dexie from 'dexie'

export const db = new Dexie('fishingAnalyticsDB')

db.version(13).stores({

  sessions: `
  ++id,
  client_uuid,
  remote_id,
  user_id,
  status,
  start_time,
  end_time,
  [user_id+status],
  temp_day_min,
  temp_day_max,
  pressure_day_min,
  pressure_day_max,
  wind_day_max,
  temp_current,
  pressure_current,
  pressure_trend_3h,
  wind_speed_current,
  wind_speed_trend_3h,
  wind_direction_current,
  wind_gust_current,
  weather_timestamp,
  updated_at
`,


  catches: `
    ++id,
    client_uuid,
    remote_id,
    session_id,
    catch_time,
    temp_current,
    pressure_current,
    pressure_trend_3h,
    wind_speed_current,
    wind_speed_trend_3h,
    wind_direction_current,
    wind_gust_current,
    weather_timestamp,
    wind_incidence_score,
    updated_at
  `,

  sync_queue: `
    ++id,
    entity_type,
    entity_local_id,
    action,
    status,
    retries,
    created_at
  `,

  metadata: `
    key
  `
})
