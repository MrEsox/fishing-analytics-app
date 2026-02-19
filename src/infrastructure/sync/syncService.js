import { db } from '@/infrastructure/db/db.js'
import { supabase } from '@/app/supabase.js'
import { useAuthStore } from '@/stores/authStore.js'

let isSyncing = false
const MAX_RETRIES = 5
const BASE_DELAY = 1000 // 1s

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isNetworkError(error) {
  return !error?.code
}

function isInvalidDexieKeyError(error) {
  return error?.name === 'DataError' || error?.message?.includes('not a valid key')
}

function calculateBackoff(retries) {
  return BASE_DELAY * Math.pow(2, retries)
}

/* =========================
   PROCESS ACTION
========================= */
async function processAction(action) {

  const authStore = useAuthStore()
  const user = authStore.user
  if (!user?.id) throw new Error('User not authenticated')

  const localId = Number(action.entity_local_id)
  if (!Number.isFinite(localId)) {
    throw new Error('Invalid local id')
  }

  switch (action.entity_type) {

    case 'session': {

      const session = await db.sessions.get(localId)
      if (!session) throw new Error('Session not found')

      const payload = {
        client_uuid: session.client_uuid,
        user_id: user.id,
        start_time: session.start_time,
        end_time: session.end_time,
        total_catches: session.total_catches,
        status: session.status,
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

    case 'catch': {

      const catchItem = await db.catches.get(localId)
      if (!catchItem) throw new Error('Catch not found')

      const sessionLocalId = Number(catchItem.session_id)
      if (!Number.isFinite(sessionLocalId)) {
        throw new Error('Invalid catch session_id')
      }

      const session = await db.sessions.get(sessionLocalId)
      if (!session?.remote_id) {
        throw new Error('Session must be synced first')
      }

      const payload = {
        client_uuid: catchItem.client_uuid,
        session_id: session.remote_id,
        catch_time: catchItem.catch_time,
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
      throw new Error('Unknown entity type')
  }
}

/* =========================
   PUSH QUEUE
========================= */
async function pushQueue() {

  if (!navigator.onLine) return

  const pendingActions = await db.sync_queue
    .where('status')
    .equals('pending')
    .sortBy('created_at')

  for (const action of pendingActions) {

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

      if (isInvalidDexieKeyError(error) || error?.message === 'Invalid catch session_id') {
        await db.sync_queue.update(action.id, { status: 'failed' })
        continue
      }

      const newRetries = action.retries + 1
      const delay = calculateBackoff(newRetries)

      await db.sync_queue.update(action.id, {
        retries: newRetries
      })

      if (isNetworkError(error)) {
        await sleep(delay)
      }
    }
  }
}

/* =========================
   PUBLIC API
========================= */
export const syncService = {

  async syncQueue() {

    if (isSyncing) return
    isSyncing = true

    try {
      await pushQueue()
    } finally {
      isSyncing = false
    }
  },

  async fullSync() {
    await this.syncQueue()
  }
}
