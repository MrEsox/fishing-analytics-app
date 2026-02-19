<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore.js'
import { syncService } from '@/infrastructure/sync/syncService.js'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(null)
const shake = ref(false)

const auth = useAuthStore()
const router = useRouter()

async function handleLogin() {
  error.value = null
  loading.value = true

  try {

    // 🔥 CORRECTION : signIn et pas login
    await auth.signIn(email.value, password.value)

    // 🔥 Full sync pour récupérer données précédentes
    await syncService.fullSync()

    await router.push('/')

  } catch (err) {

    console.error(err)
    error.value = 'Invalid credentials'
    shake.value = true
    setTimeout(() => (shake.value = false), 500)

  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-black flex justify-center items-center overflow-hidden relative">
    <!-- Animated background glow -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.15),transparent_40%)] animate-pulse" />

    <div
      :class="[
        'relative w-full max-w-[420px] px-6 transition',
        shake ? 'animate-[shake_0.4s]' : ''
      ]"
    >
      <div class="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <!-- HEADER -->
        <div class="mb-10 text-center">
          <div class="text-xs tracking-widest text-zinc-500 mb-2">
            FISHING COCKPIT
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            Welcome Back
          </h1>
        </div>

        <!-- ERROR -->
        <div
          v-if="error"
          class="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center"
        >
          {{ error }}
        </div>

        <form
          class="flex flex-col gap-6"
          @submit.prevent="handleLogin"
        >
          <!-- EMAIL -->
          <div class="relative">
            <input
              v-model="email"
              type="email"
              required
              placeholder=" "
              class="peer w-full bg-black border border-zinc-700 rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
            <label class="absolute left-4 top-2 text-xs text-zinc-500 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-600 transition-all">
              Email
            </label>
          </div>

          <!-- PASSWORD -->
          <div class="relative">
            <input
              v-model="password"
              type="password"
              required
              placeholder=" "
              class="peer w-full bg-black border border-zinc-700 rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
            <label class="absolute left-4 top-2 text-xs text-zinc-500 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-600 transition-all">
              Password
            </label>
          </div>

          <!-- BUTTON -->
          <button
            type="submit"
            :disabled="loading"
            class="relative mt-4 w-full bg-gradient-to-r from-blue-500 to-indigo-600 py-4 rounded-2xl text-lg font-bold shadow-xl active:scale-95 transition disabled:opacity-50 overflow-hidden"
          >
            <span v-if="!loading">Login</span>

            <svg
              v-else
              class="animate-spin h-6 w-6 mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="white"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="white"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </button>
          <div class="mt-6">
            <button
              type="button"
              class="w-full border border-zinc-700 py-3 rounded-2xl text-sm text-zinc-400 hover:bg-zinc-800 transition"
              @click="$router.push('/signup')"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>

      <div class="mt-6 text-center text-xs text-zinc-600">
        Secure Supabase Authentication
      </div>
    </div>
  </div>
</template>

<style>
@keyframes shake {
  0% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
  100% { transform: translateX(0); }
}
</style>
