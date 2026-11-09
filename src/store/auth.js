// 登录态管理：优先 Supabase 云端账号；云端不可达时自动降级到本地账号。
// 本地账号只存在浏览器 localStorage，保证断网/被墙时也能登录演示。
import { signIn, signUp, signOut, isLoggedIn as cloudHasSession, currentUserId, currentUserEmail } from '../api/supabase'
import * as local from './localAuth'

const STORAGE_KEY = 'ps_auth_user'

// 云端请求超时（毫秒）：连不上就尽快降级，别让页面卡住
const CLOUD_TIMEOUT = 6000

function withTimeout(promise, ms, label = '请求超时') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms))
  ])
}

// 判断是否为「网络/连接」类错误（而不是账号密码错误）
function isNetworkError(e) {
  const text = String((e && (e.message || e.name)) || e || '')
  return /fetch|network|timeout|超时|Failed to fetch|Load failed|ERR_|NetworkError|AuthRetryable/i.test(text)
}

function cacheUser(user) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)) } catch {}
}

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function isLocalUser(u) {
  return Boolean(u && u.mode === 'local')
}

export const auth = {
  /** 最近一次使用的登录方式：cloud / local */
  lastMode: '',

  async register(email, password) {
    try {
      const data = await withTimeout(signUp(email, password), CLOUD_TIMEOUT, '云端连接超时')
      const user = {
        email: email.trim(),
        uid: (data && data.user && data.user.id) || null,
        mode: 'cloud',
        ts: Date.now()
      }
      this.lastMode = 'cloud'
      cacheUser(user)
      return data
    } catch (e) {
      // 云端连不上 / 超时 → 建本地账号；账号本身报错（已存在、密码太短等）则原样抛出
      if (!isNetworkError(e)) throw e
      const res = await local.registerLocal(email, password)
      this.lastMode = 'local'
      cacheUser(res.user)
      return res
    }
  },

  async login(email, password) {
    try {
      const data = await withTimeout(signIn(email, password), CLOUD_TIMEOUT, '云端连接超时')
      const user = {
        email: email.trim(),
        uid: (data && data.user && data.user.id) || null,
        mode: 'cloud',
        ts: Date.now()
      }
      this.lastMode = 'cloud'
      cacheUser(user)
      return data
    } catch (e) {
      // 云端不可达 → 走本地；云端可达但账号不存在/密码错，若本机有该账号也让它登录
      const localExists = local.hasLocalAccount(email)
      if (!isNetworkError(e) && !localExists) throw e
      try {
        const res = await local.loginLocal(email, password)
        this.lastMode = 'local'
        cacheUser(res.user)
        return res
      } catch (localErr) {
        // 本地也登不上：优先反馈云端原因（比如密码错误），否则反馈本地原因
        throw isNetworkError(e) ? localErr : e
      }
    }
  },

  async logout() {
    // 云端退出失败（断网）不影响本地退出
    try { await withTimeout(signOut(), 2500, '退出超时') } catch {}
    local.logoutLocal()
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  },

  async currentUser() {
    const cached = readCache()
    if (cached && Date.now() - cached.ts < 30000) return cached

    // 1) 先看云端会话（带超时，避免卡住启动流程）
    try {
      const ok = await withTimeout(cloudHasSession(), 2500, '云端会话超时')
      if (ok) {
        const user = {
          email: await withTimeout(currentUserEmail(), 2500, '读取邮箱超时'),
          uid: await withTimeout(currentUserId(), 2500, '读取用户超时'),
          mode: 'cloud',
          ts: Date.now()
        }
        cacheUser(user)
        return user
      }
    } catch {}

    // 2) 云端不可用或未登录 → 看本地会话
    const localUser = local.localSession()
    if (localUser) {
      cacheUser(localUser)
      return localUser
    }

    return null
  },

  isLoggedIn() {
    // 同步判断：缓存（云端或本地）里有登录信息就算已登录
    return !!readCache()
  },

  /** 当前是否为本地账号登录（UI 用来提示数据只存本机） */
  isLocal() {
    return isLocalUser(readCache())
  },

  async checkSession() {
    return await this.currentUser()
  },

  async updateUser(patch) {
    const cur = readCache() || {}
    const next = { ...cur, ...patch }
    cacheUser(next)
    if (isLocalUser(next) && next.email) {
      try { local.updateLocalNickname(next.email, next.nickname) } catch {}
    }
    return next
  }
}
