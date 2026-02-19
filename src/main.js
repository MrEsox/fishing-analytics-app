import { createApp } from 'vue'
import App from './App.vue'
import { pinia } from '@/app/pinia'
import { router } from '@/app/router'
import { syncService } from '@/infrastructure/sync/syncService.js'
import { useAuthStore } from '@/stores/authStore.js'
import './style.css'

const app = createApp(App)

app
  .use(pinia)
  .use(router)
  .mount('#app')

const authStore = useAuthStore(pinia)

/* =========================
   INIT AUTH + FULL SYNC
========================= */
authStore.init().then(async () => {

  if (authStore.user) {
    await syncService.fullSync()
  }

})

/* =========================
   ONLINE EVENT
========================= */
window.addEventListener('online', async () => {
  if (authStore.user) {
    await syncService.fullSync()
  }
})

window.addEventListener('offline', () => {
  console.log('Offline mode')
})
