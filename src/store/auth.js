// 登录态管理：有后端时走服务端校验并保存 token；无后端时回退到本地演示。
import { request, setToken, clearToken, HAS_BACKEND } from '../api/http'

const STORAGE_KEY = 'ps_auth_user'
const LOCAL_USER = { username: 'admin', password: '123456', nickname: '管理员' }

export const auth = {
  async login(username, password) {
    if (!username || !password) return null

    if (HAS_BACKEND) {
      try {
        const d = await request('/api/login', {
          method: 'POST',
          body: { username, password },
          auth: false
        })
        if (!d || !d.ok) return null
        setToken(d.token)
        const user = { username, nickname: '管理员', loginAt: Date.now(), server: true }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
        return user
      } catch (err) {
        // 后端不可用（停服 / 欠费 / 断网）时降级到本地演示账号，保证页面仍能进入
        if (username === LOCAL_USER.username && password === LOCAL_USER.password) {
          const user = { username, nickname: LOCAL_USER.nickname, loginAt: Date.now(), offline: true }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
          return user
        }
        throw err
      }
    }

    // 无后端（纯静态）时的本地演示登录
    if (username === LOCAL_USER.username && password === LOCAL_USER.password) {
      const user = { username, nickname: LOCAL_USER.nickname, loginAt: Date.now() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      return user
    }
    return null
  },

  logout() {
    clearToken()
    localStorage.removeItem(STORAGE_KEY)
  },

  currentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  // 更新登录用户信息（改昵称等），不影响 token
  updateUser(patch) {
    const cur = this.currentUser() || {}
    const next = { ...cur, ...patch }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    return next
  },

  isLoggedIn() {
    return !!this.currentUser()
  }
}

export const DEFAULT_ACCOUNT = {
  username: LOCAL_USER.username,
  password: LOCAL_USER.password
}