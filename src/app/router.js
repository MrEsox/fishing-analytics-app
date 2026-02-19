import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore.js'

import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import SessionView from '@/views/SessionView.vue'
import SpotsView from '@/views/SpotsView.vue'
import SignupView from '@/views/SignupView.vue'

const routes = [
  { path: '/', component: DashboardView },
  { path: '/login', component: LoginView },
  { path: '/signup', component: SignupView },
  { path: '/session', component: SessionView },
  { path: '/spots', component: SpotsView }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

/* =========================
   ROUTE GUARD GLOBAL
========================= */
router.beforeEach((to, from, next) => {

  const auth = useAuthStore()

  const publicPages = ['/login', '/signup']
  const authRequired = !publicPages.includes(to.path)

  if (authRequired && !auth.user) {
    return next('/login')
  }

  if ((to.path === '/login' || to.path === '/signup') && auth.user) {
    return next('/')
  }

  next()
})
  