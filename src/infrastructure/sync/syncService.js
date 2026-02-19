import { db } from '@/infrastructure/db/db.js'
import { supabase } from '@/app/supabase.js'
import { useAuthStore } from '@/stores/authStore.js'

let isSyncing = false
const MAX_RETRIES = 5

/* =========================
   METADATA
========================= */
async function getLastSync() {
  const record = await db.metadata.get('last_sync')
  return record?.value || null
}

async function setLastSync(date) {
  await db.metadata.put({
    key: 'last_sync',
    value: date
  })
}

/* =========================
   PROCESS ACTION
========================= */
async function processAction(action) {

  if (!action?.entity_local_id) {
    throw new Error('Invalid local id')
  }

  const authStore = useAuthStore()
  const user = authStore.user
  if (!user) throw new Error('User not authenticated')

  switch (action.entity_type) {

    /* =========================
       SESSION
    ========================= */
    case 'session': {

      const session = await db.sessions.get(action.entity_local_id)
      if (!session) throw new Error('Session not found')

      const payload = {
        client_uuid: session.client_uuid,
        user_id: user.id,
        spot_id: session.spot_id,
        start_time: session.start_time,
        end_time: session.end_time,
        total_catches: session.total_catches,
        status: session.status,

        temp_day_min: session.temp_day_min,
        temp_day_max: session.temp_day_max,
        pressure_day_min: session.pressure_day_min,
        pressure_day_max: session.pressure_day_max,
        wind_day_max: session.wind_day_max,

        temp_current: session.temp_current,
        pressure_current: session.pressure_current,
        pressure_trend_3h: session.pressure_trend_3h,
        wind_speed_current: session.wind_speed_current,
        wind_speed_trend_3h: session.wind_speed_trend_3h,
        wind_direction_current: session.wind_direction_current,
        wind_gust_current: session.wind_gust_current,
        weather_timestamp: session.weather_timestamp,

        updated_at: new Date()
      }

      const { data, error } = await supabase
        .from('sessions')
        .upsert(payload, { onConflict: 'client_uuid' })
        .select()
        .single()

      if (error) throw error

      await db.sessions.update(session.id, {
        remote_id: data.id
      })

      break
    }

    /* =========================
       CATCH
    ========================= */
    case 'catch': {

      const catchItem = await db.catches.get(action.entity_local_id)
      if (!catchItem) throw new Error('Catch not found')

      const session = await db.sessions.get(catchItem.session_id)
      if (!session) throw new Error('Session not found')

      if (!session.remote_id) {
        const { data, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('client_uuid', session.client_uuid)
          .single()

        if (error || !data)
          throw new Error('Session must be synced first')

        await db.sessions.update(session.id, {
          remote_id: data.id
        })

        session.remote_id = data.id
      }

      const payload = {
        client_uuid: catchItem.client_uuid,
        session_id: session.remote_id,
        species: catchItem.species,
        weight: catchItem.weight,
        length: catchItem.length,
        catch_time: catchItem.catch_time,

        temp_current: catchItem.temp_current,
        pressure_current: catchItem.pressure_current,
        pressure_trend_3h: catchItem.pressure_trend_3h,
        wind_speed_current: catchItem.wind_speed_current,
        wind_speed_trend_3h: catchItem.wind_speed_trend_3h,
        wind_direction_current: catchItem.wind_direction_current,
        wind_gust_current: catchItem.wind_gust_current,
        weather_timestamp: catchItem.weather_timestamp,

        latitude: catchItem.latitude,
        longitude: catchItem.longitude,
        wind_incidence_score: catchItem.wind_incidence_score,
        updated_at: new Date()
      }

      const { data, error } = await supabase
        .from('catches')
        .upsert(payload, { onConflict: 'client_uuid' })
        .select()
        .single()

      if (error) throw error

      await db.catches.update(catchItem.id, {
        remote_id: data.id
      })

      break
    }

    default:
      throw new Error(`Unknown entity type: ${action.entity_type}`)
  }
}

/* =========================
   PUSH QUEUE
========================= */
async function pushQueue() {

  const pendingActions = await db.sync_queue
    .where('status')
    .equals('pending')
    .sortBy('created_at')

  const sessionActions = pendingActions.filter(a => a.entity_type === 'session')
  const catchActions = pendingActions.filter(a => a.entity_type === 'catch')

  const orderedActions = [...sessionActions, ...catchActions]

  for (const action of orderedActions) {

    if (action.retries >= MAX_RETRIES) {
      await db.sync_queue.update(action.id, { status: 'failed' })
      continue
    }

    try {

      await processAction(action)

      await db.sync_queue.update(action.id, {
        status: 'synced'
      })

    } catch (error) {

      await db.sync_queue.update(action.id, {
        retries: action.retries + 1,
        status:
          action.retries + 1 >= MAX_RETRIES
            ? 'failed'
            : 'pending'
      })

      console.error('Sync action failed:', error)
    }
  }
}

/* =========================
   PULL SYNC
========================= */
async function pullSync() {

  const authStore = useAuthStore()
  const user = authStore.user
  if (!user) return

  const lastSync = await getLastSync()

  let sessionQuery = supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)

  if (lastSync)
    sessionQuery = sessionQuery.gt('updated_at', lastSync)

  const { data: sessions } = await sessionQuery

  for (const remoteSession of sessions || []) {

    const existing = await db.sessions
      .where('client_uuid')
      .equals(remoteSession.client_uuid)
      .first()

    if (existing)
      await db.sessions.update(existing.id, remoteSession)
    else
      await db.sessions.add(remoteSession)
  }

  let catchQuery = supabase
    .from('catches')
    .select('*')

  if (lastSync)
    catchQuery = catchQuery.gt('updated_at', lastSync)

  const { data: catches } = await catchQuery

  for (const remoteCatch of catches || []) {

    const existing = await db.catches
      .where('client_uuid')
      .equals(remoteCatch.client_uuid)
      .first()

    if (existing)
      await db.catches.update(existing.id, remoteCatch)
    else
      await db.catches.add(remoteCatch)
  }

  await setLastSync(new Date().toISOString())
}

/* =========================
   PUBLIC API
========================= */
export const syncService = {

  async fullSync() {

    if (isSyncing) return
    isSyncing = true

    try {
      await pullSync()
      await pushQueue()
    } catch (error) {
      console.error('Full sync failed:', error)
    } finally {
      isSyncing = false
    }
  },

  async syncQueue() {

    if (isSyncing) return
    isSyncing = true

    try {
      await pushQueue()
    } finally {
      isSyncing = false
    }
  }
}
