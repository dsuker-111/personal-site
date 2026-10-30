// 登录态管理：Supabase Auth + 本地回退
import { supabase, signIn, signUp, signOut, isLoggedIn, currentUserId } from '../api/supabase'
import { setToken, clearToken } from '../api/http'

const STORAGE_KEY = 'ps_auth_user'

export const auth = {
  async login(email, password) {
    const { user } = await signIn(email, password)
    // supabase session 已自动存 localStorage
    setToken('supabase') // 标记已登录
    const profile = { id: user.id, email: user.email, nickname: '', loginAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    return profile
  },

  async register(email, password) {
    const { user } = await signUp(email, password)
    setToken('supabase')
    const profile = { id: user.id, email: user.email, nickname: '', loginAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    return profile
  },

  async logout() {
    await signOut()
    clearToken()
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('ps_profile')
    localStorage.removeItem('ps_chat_history')
  },

  currentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  },

  async checkSession() {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      this.logout()
      return null
    }
    return this.currentUser()
  },

  updateUser(patch) {
    const cur = this.currentUser() || {}
    const next = { ...cur, ...patch }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    return next
  }
}