// 登录态管理：Supabase Auth 邮箱+密码，登录信息存 localStorage 缓存
import { supabase, signIn, signUp, signOut, isLoggedIn, currentUserId, currentUserEmail } from '../api/supabase'

const STORAGE_KEY = 'ps_auth_user'

function cacheUser(user) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)) } catch {}
}

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export const auth = {
  async register(email, password) {
    return await signUp(email, password)
  },

  async login(email, password) {
    return await signIn(email, password)
  },

  async logout() {
    await signOut()
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  },

  async currentUser() {
    const cached = readCache()
    if (cached && Date.now() - cached.ts < 30000) return cached
    const ok = await isLoggedIn()
    if (!ok) return null
    const user = {
      email: await currentUserEmail(),
      uid: await currentUserId(),
      ts: Date.now()
    }
    cacheUser(user)
    return user
  },

  isLoggedIn() {
    // 同步判断用缓存
    return !!readCache()
  },

  async checkSession() {
    const user = await this.currentUser()
    return user
  },

  async updateUser(patch) {
    const cur = readCache() || {}
    const next = { ...cur, ...patch }
    cacheUser(next)
    return next
  }
}