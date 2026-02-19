<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore.js'
import sessionRepository from '@/infrastructure/repositories/sessionRepository.js'
import catchRepository from '@/infrastructure/repositories/catchRepository.js'
import { syncService } from '@/infrastructure/sync/syncService.js'
import { db } from '@/infrastructure/db/db.js'
import { useRouter } from 'vue-router'
import { getWeatherData } from '@/services/weatherService.js'

const auth = useAuthStore()
const router = useRouter()

const activeSession = ref(null)
const dailyWeather = ref(null)
const elapsed = ref(0)
const catchCount = ref(0)

let timer = null

/* =========================
   LOAD DAILY WEATHER
========================= */
async function loadDailyWeather() {
  try {
    const weather = await getWeatherData(33.5731, -7.5898)
    dailyWeather.value = weather.day
  } catch {
    dailyWeather.value = null
  }
}

/* =========================
   LOAD ACTIVE SESSION
========================= */
async function loadActiveSession() {

  if (!auth.user?.id) return

  const session =
    await sessionRepository.getActiveSession(auth.user.id)

  if (!session?.id) {
    activeSession.value = null
    catchCount.value = 0
    return
  }

  activeSession.value = session
  startTimer()
  await updateCatchCount()
}

/* =========================
   START SESSION
========================= */
async function startSession() {

  if (!auth.user?.id) return

  const session =
    await sessionRepository.startSession(auth.user.id)

  activeSession.value = session
  catchCount.value = 0
  startTimer()

  await syncService.syncQueue()
}

/* =========================
   ADD CATCH
========================= */
async function addCatch() {

  if (!activeSession.value?.id) return

  await catchRepository.addCatch(activeSession.value)
  await updateCatchCount()
}

/* =========================
   END SESSION
========================= */
async function endSession() {

  if (!activeSession.value?.id) return

  await sessionRepository.endSession(
    Number(activeSession.value.id)
  )

  await syncService.syncQueue()

  clearInterval(timer)
  activeSession.value = null
  elapsed.value = 0
  catchCount.value = 0
}

/* =========================
   LOGOUT
========================= */
async function logout() {
  clearInterval(timer)
  await auth.signOut()
  await router.replace('/login')
}

/* =========================
   TIMER
========================= */
function startTimer() {

  clearInterval(timer)

  timer = setInterval(() => {

    if (!activeSession.value?.start_time) return

    const start = new Date(activeSession.value.start_time)

    elapsed.value =
      Math.floor((Date.now() - start.getTime()) / 1000)

  }, 1000)
}

const formattedTime = computed(() => {
  const h = Math.floor(elapsed.value / 3600)
  const m = Math.floor((elapsed.value % 3600) / 60)
  return `${h}h ${m}m`
})

/* =========================
   SAFE CATCH COUNT
========================= */
async function updateCatchCount() {

  const rawId = activeSession.value?.id
  const sessionId = Number(rawId)

  if (!rawId || !Number.isFinite(sessionId)) {
    catchCount.value = 0
    return
  }

  catchCount.value =
    await db.catches
      .where('session_id')
      .equals(sessionId)
      .count()
}

/* =========================
   LIFECYCLE
========================= */
onMounted(async () => {

  if (!auth.user?.id) return

  await loadDailyWeather()
  await loadActiveSession()
})

watch(
  () => auth.user?.id,
  async (id) => {

    if (!id) return

    await loadDailyWeather()
    await loadActiveSession()
  }
)
</script>

<template>
  <div class="min-h-screen bg-black flex justify-center">
    <div class="w-full max-w-[430px] min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white px-6 pt-8 pb-10">

      <!-- HEADER -->
      <div class="flex justify-between items-center mb-10">
        <div>
          <div class="text-[10px] tracking-widest text-zinc-500">
            COCKPIT
          </div>
          <div class="text-2xl font-bold">
            Fishing Session
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
            SYNC READY
          </div>

          <button
            @click="logout"
            class="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full hover:bg-red-500/30 transition"
          >
            SIGN OUT
          </button>
        </div>
      </div>

      <!-- CONDITIONS -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8 shadow-2xl">

        <div class="text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
          Conditions
        </div>

        <!-- DAILY -->
        <div v-if="!activeSession && dailyWeather" class="grid grid-cols-2 gap-y-6">

          <div>
            <div class="text-xs text-zinc-500">Temp Day</div>
            <div class="text-2xl font-semibold">
              {{ dailyWeather.temp_day_min }}° / {{ dailyWeather.temp_day_max }}°
            </div>
          </div>

          <div>
            <div class="text-xs text-zinc-500">Pressure Day</div>
            <div class="text-2xl font-semibold">
              {{ dailyWeather.pressure_day_min }} / {{ dailyWeather.pressure_day_max }}
            </div>
          </div>

          <div>
            <div class="text-xs text-zinc-500">Wind Max</div>
            <div class="text-2xl font-semibold">
              {{ dailyWeather.wind_day_max }} km/h
            </div>
          </div>

        </div>

        <!-- SESSION SNAPSHOT -->
        <div v-else-if="activeSession" class="grid grid-cols-2 gap-y-6">

          <div>
            <div class="text-xs text-zinc-500">Wind Dir</div>
            <div class="text-2xl font-semibold">
              {{ activeSession.wind_direction_current }}°
            </div>
          </div>

          <div>
            <div class="text-xs text-zinc-500">Wind Speed</div>
            <div class="text-2xl font-semibold">
              {{ activeSession.wind_speed_current }} km/h
            </div>
          </div>

          <div>
            <div class="text-xs text-zinc-500">Temp</div>
            <div class="text-2xl font-semibold">
              {{ activeSession.temp_current }}°C
            </div>
          </div>

          <div>
            <div class="text-xs text-zinc-500">Pressure</div>
            <div class="text-2xl font-semibold">
              {{ activeSession.pressure_current }} hPa
            </div>

            <div
              class="text-sm mt-1"
              :class="activeSession.pressure_trend_3h >= 0 ? 'text-green-400' : 'text-red-400'"
            >
              {{ activeSession.pressure_trend_3h >= 0 ? '+' : '' }}
              {{ activeSession.pressure_trend_3h }} (3h)
            </div>
          </div>

        </div>

      </div>

      <!-- ACTIONS -->
      <div class="flex flex-col gap-6">

        <button
          v-if="!activeSession"
          @click="startSession"
          class="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-6 rounded-3xl text-xl font-bold shadow-xl active:scale-95 transition"
        >
          START SESSION
        </button>

        <div v-else class="flex flex-col gap-5">

          <button
            @click="addCatch"
            class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 py-8 rounded-3xl text-3xl font-bold shadow-2xl active:scale-95 transition"
          >
            + CATCH
          </button>

          <button
            @click="endSession"
            class="w-full bg-zinc-800 border border-zinc-700 py-3 rounded-2xl text-sm text-zinc-300 hover:bg-zinc-700 transition"
          >
            End Session
          </button>

        </div>

      </div>

      <!-- STATS -->
      <div
        v-if="activeSession"
        class="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between"
      >
        <div>
          <div class="text-[10px] text-zinc-500 uppercase">
            Duration
          </div>
          <div class="font-semibold">
            {{ formattedTime }}
          </div>
        </div>

        <div>
          <div class="text-[10px] text-zinc-500 uppercase">
            Catches
          </div>
          <div class="font-semibold text-blue-400">
            {{ catchCount }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
