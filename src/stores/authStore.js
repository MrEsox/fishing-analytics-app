import { defineStore } from 'pinia'
import { supabase } from '@/app/supabase.js'

export const useAuthStore = defineStore('auth', {

  state: () => ({
    user: null,
    loading: false
  }),

  actions: {

    async init() {
      const { data } = await supabase.auth.getSession()
      this.user = data.session?.user ?? null

      supabase.auth.onAuthStateChange((_, session) => {
        this.user = session?.user ?? null
      })
    },

    async signUp(email, password) {

      this.loading = true

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      this.loading = false

      if (error) throw error

      this.user = data.user ?? null
    },

    async signIn(email, password) {

      this.loading = true

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      this.loading = false

      if (error) throw error

      this.user = data.user
    },

    async signOut() {
      await supabase.auth.signOut()
      this.user = null
    }

  }
})
