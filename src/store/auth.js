// 登录态管理：本地用户名+密码注册/登录；数据同步走 Supabase
import { setToken, clearToken } from '../api/http'

const STORAGE_KEY = 'ps_auth_user'
const USERS_KEY = 'ps_users'

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}') } catch { return {} }
}

function saveUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)) } catch { /* ignore */ }
}

export const auth = {
  // 注册
  register(username, password) {
    if (!username || !password) return null
    const users = loadUsers()
    if (users[username]) return null // 已存在
    users[username] = password
    saveUsers(users)
    const profile = { username, loginAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    setToken('local')
    return profile
  },

  // 登录
  login(username, password) {
    if (!username || !password) return null
    const users = loadUsers()
    if (users[username] !== password) return null
    const profile = { username, loginAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    setToken('local')
    return profile
  },

  logout() {
    clearToken()
    localStorage.removeItem(STORAGE_KEY)
  },

  currentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  },

  isLoggedIn() {
    return !!this.currentUser()
  },

  checkSession() {
    return this.currentUser()
  },

  updateUser(patch) {
    const cur = this.currentUser() || {}
    const next = { ...cur, ...patch }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    return next
  }
}