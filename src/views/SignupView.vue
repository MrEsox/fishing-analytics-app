<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref(null)
const success = ref(false)

/* =========================
   EMAIL VALIDATION
========================= */
const emailValid = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
)

/* =========================
   PASSWORD STRENGTH
========================= */
const strength = computed(() => {
  let score = 0
  if (password.value.length >= 8) score++
  if (/[A-Z]/.test(password.value)) score++
  if (/[0-9]/.test(password.value)) score++
  if (/[^A-Za-z0-9]/.test(password.value)) score++
  return score
})

const strengthColor = computed(() => {
  if (strength.value <= 1) return 'bg-red-500'
  if (strength.value === 2) return 'bg-yellow-500'
  if (strength.value === 3) return 'bg-blue-500'
  return 'bg-green-500'
})

/* =========================
   SUBMIT
========================= */
async function handleSignup() {
  error.value = null

  if (!emailValid.value) {
    error.value = 'Invalid email format'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true

  try {
    // ✅ IMPORTANT : bon nom des fonctions
    await auth.signUp(email.value, password.value)
    await auth.signIn(email.value, password.value)

    success.value = true

    setTimeout(() => {
      router.push('/session')
    }, 1200)

  } catch (err) {
    console.error(err)
    error.value = err.message || 'Signup failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-black flex justify-center items-center relative overflow-hidden">

    <!-- Background glow -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.15),transparent_40%)] animate-pulse"></div>

    <div class="relative w-full max-w-[420px] px-6">

      <div class="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl transition-all duration-500">

        <!-- SUCCESS STATE -->
        <div v-if="success" class="text-center py-10">

          <div class="flex justify-center mb-6">
            <div class="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center animate-scaleIn">
              <svg viewBox="0 0 24 24" class="h-8 w-8 text-white">
                <path fill="currentColor"
                  d="M9 16.2l-3.5-3.5L4 14.2 9 19l11-11-1.5-1.5z" />
              </svg>
            </div>
          </div>

          <h2 class="text-xl font-semibold">Account Created</h2>
          <p class="text-zinc-500 text-sm mt-2">Redirecting...</p>

        </div>

        <!-- FORM -->
        <div v-else>

          <div class="mb-10 text-center">
            <div class="text-xs tracking-widest text-zinc-500 mb-2">
              CREATE ACCOUNT
            </div>
            <h1 class="text-3xl font-bold">Join the Cockpit</h1>
          </div>

          <div
            v-if="error"
            class="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center"
          >
            {{ error }}
          </div>

          <form @submit.prevent="handleSignup" class="flex flex-col gap-6">

            <!-- EMAIL -->
            <div class="relative">
              <input
                v-model="email"
                type="email"
                required
                placeholder=" "
                class="peer w-full bg-black border border-zinc-700 rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <label class="absolute left-4 top-2 text-xs text-zinc-500 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm transition-all">
                Email
              </label>

              <div
                v-if="email && emailValid"
                class="absolute right-4 top-4 text-green-400 text-xs"
              >
                ✓
              </div>
            </div>

            <!-- PASSWORD -->
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                placeholder=" "
                class="peer w-full bg-black border border-zinc-700 rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <label class="absolute left-4 top-2 text-xs text-zinc-500 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm transition-all">
                Password
              </label>

              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-4 top-4 text-zinc-500 text-xs"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>

            <!-- STRENGTH -->
            <div v-if="password.length > 0">
              <div class="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  :class="['h-2 transition-all duration-300', strengthColor]"
                  :style="{ width: (strength * 25) + '%' }"
                ></div>
              </div>
            </div>

            <!-- CONFIRM -->
            <div class="relative">
              <input
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                placeholder=" "
                class="peer w-full bg-black border border-zinc-700 rounded-xl px-4 pt-6 pb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <label class="absolute left-4 top-2 text-xs text-zinc-500 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm transition-all">
                Confirm Password
              </label>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="mt-4 w-full bg-gradient-to-r from-emerald-500 to-green-600 py-4 rounded-2xl text-lg font-bold shadow-xl active:scale-95 transition disabled:opacity-50"
            >
              {{ loading ? 'Creating...' : 'Sign Up' }}
            </button>

          </form>

        </div>

      </div>

      <div class="mt-6 text-center text-xs text-zinc-600">
        Already have an account?
        <button
          @click="router.push('/login')"
          class="ml-2 text-emerald-400 hover:text-emerald-300 transition"
        >
          Login
        </button>
      </div>

    </div>
  </div>
</template>

<style>
@keyframes scaleIn {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-scaleIn {
  animation: scaleIn 0.4s ease-out;
}
</style>
