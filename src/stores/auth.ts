import { defineStore } from 'pinia'
import type { User } from '@/types'
import { seedUsers } from '@/seed'

interface AuthState {
  users: User[]
  currentUserId: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState & { _loaded?: boolean } => ({
    users: [],
    currentUserId: null
  }),
  getters: {
    currentUser(state): User | null {
      return state.users.find((u) => u.id === state.currentUserId) ?? null
    },
    isLoggedIn(): boolean {
      return !!this.currentUser
    }
  },
  actions: {
    hydrate() {
      const raw = localStorage.getItem('nk-auth')
      if (raw) {
        try {
          const data = JSON.parse(raw)
          this.users = data.users?.length ? data.users : seedUsers
          this.currentUserId = data.currentUserId ?? null
        } catch {
          this.users = seedUsers
        }
      } else {
        this.users = seedUsers
      }
    },
    persist() {
      localStorage.setItem(
        'nk-auth',
        JSON.stringify({ users: this.users, currentUserId: this.currentUserId })
      )
    },
    login(username: string, password: string): { ok: boolean; msg?: string } {
      const user = this.users.find(
        (u) => u.username === username.trim() && u.password === password
      )
      if (!user) return { ok: false, msg: '用户名或密码错误' }
      this.currentUserId = user.id
      this.persist()
      return { ok: true }
    },
    logout() {
      this.currentUserId = null
      this.persist()
    },
    userName(id?: string) {
      if (!id) return '系统'
      return this.users.find((u) => u.id === id)?.name ?? id
    }
  }
})
