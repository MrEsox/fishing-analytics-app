<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore.js'
import { db } from '@/infrastructure/db/db.js'
import sessionRepository from '@/infrastructure/repositories/sessionRepository.js'
import { getWeatherData } from '@/services/weatherService.js'

const auth = useAuthStore()
const router = useRouter()

const yearSessionsCount = ref(0)
const totalCatches = ref(0)
const windDirection = ref(null)

const currentYear = new Date().getFullYear()

function normalizeAngle(value) {
  return ((value % 360) + 360) % 360
}

function toCardinalDirection(deg) {
  if (!Number.isFinite(deg)) return '--'

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  const normalized = normalizeAngle(deg)
  const index = Math.round(normalized / 45) % 8

  return directions[index]
}

const catchesPerSession = computed(() => {
  if (yearSessionsCount.value === 0) return 0
  return (totalCatches.value / yearSessionsCount.value).toFixed(1)
})

const recommendedFishingOrientation = computed(() => {
  if (!Number.isFinite(windDirection.value)) return null

  const orientation = normalizeAngle(windDirection.value + 180)

  return {
    angle: Math.round(orientation),
    cardinal: toCardinalDirection(orientation)
  }
})

const windDirectionLabel = computed(() => {
  if (!Number.isFinite(windDirection.value)) return '--'
  return `${Math.round(windDirection.value)}° (${toCardinalDirection(windDirection.value)})`
})

const orientationAdvice = computed(() => {
  if (!recommendedFishingOrientation.value) {
    return 'Données vent indisponibles pour le moment.'
  }

  return `Pour garder une présentation naturelle, place-toi orienté vers ${recommendedFishingOrientation.value.cardinal} (${recommendedFishingOrientation.value.angle}°), soit globalement sous le vent.`
})

async function loadDashboardData() {
  if (!auth.user?.id) return

  const sessions = await sessionRepository.getAllByUser(auth.user.id)
  const sessionsThisYear = sessions.filter((session) => {
    if (!session?.start_time) return false
    return new Date(session.start_time).getFullYear() === currentYear
  })

  yearSessionsCount.value = sessionsThisYear.length

  const sessionIds = sessionsThisYear
    .map(session => Number(session.id))
    .filter(Number.isFinite)

  if (sessionIds.length === 0) {
    totalCatches.value = 0
  } else {
    totalCatches.value = await db.catches
      .where('session_id')
      .anyOf(sessionIds)
      .count()
  }

  try {
    const weather = await getWeatherData(33.5731, -7.5898)
    windDirection.value = Number(weather.snapshot?.wind_direction_current)
  } catch {
    windDirection.value = null
  }
}

async function logout() {
  await auth.signOut()
  await router.replace('/login')
}

onMounted(async () => {
  await loadDashboardData()
})

watch(
  () => auth.user?.id,
  async (id) => {
    if (!id) return
    await loadDashboardData()
  }
)
</script>

<template>
  <div class="min-h-screen bg-black flex justify-center">
    <div class="w-full max-w-[430px] min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white px-6 pt-8 pb-10">
      <div class="flex justify-between items-center mb-10">
        <div>
          <div class="text-[10px] tracking-widest text-zinc-500">
            COCKPIT
          </div>
          <div class="text-2xl font-bold">
            Dashboard
          </div>
        </div>

        <button
          class="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full hover:bg-red-500/30 transition"
          @click="logout"
        >
          SIGN OUT
        </button>
      </div>

      <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8 shadow-2xl">
        <div class="text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
          Stats {{ currentYear }}
        </div>

        <div class="grid grid-cols-2 gap-y-6">
          <div>
            <div class="text-xs text-zinc-500">
              Sessions
            </div>
            <div class="text-2xl font-semibold">
              {{ yearSessionsCount }}
            </div>
          </div>

          <div>
            <div class="text-xs text-zinc-500">
              Total Catches
            </div>
            <div class="text-2xl font-semibold">
              {{ totalCatches }}
            </div>
          </div>

          <div>
            <div class="text-xs text-zinc-500">
              Catches / Session
            </div>
            <div class="text-2xl font-semibold">
              {{ catchesPerSession }}
            </div>
          </div>

          <div>
            <div class="text-xs text-zinc-500">
              Wind Direction
            </div>
            <div class="text-2xl font-semibold">
              {{ windDirectionLabel }}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div class="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">
          Conseil orientation pêche
        </div>

        <div
          v-if="recommendedFishingOrientation"
          class="text-emerald-400 text-xl font-bold mb-2"
        >
          {{ recommendedFishingOrientation.cardinal }} ({{ recommendedFishingOrientation.angle }}°)
        </div>

        <p class="text-sm text-zinc-300 leading-relaxed">
          {{ orientationAdvice }}
        </p>
      </div>
    </div>
  </div>
</template>
