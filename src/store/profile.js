// 个人信息：昵称、头像、签名、默认城市
// 存在 localStorage（按浏览器持久化），保存时同步回登录态，顶栏与主页立即生效。
import { reactive } from 'vue'
import { auth } from './auth'

const KEY = 'ps_profile'

// 可选头像：够用且不依赖任何资源文件 / 网络
export const AVATARS = ['🙂', '😎', '🐱', '🐼', '🦊', '🐳', '🍀', '🚀', '🎧', '📚', '🌙', '⚡']

export const DEFAULT_CITY = '杭州'

function defaults(username, nickname) {
  return {
    username: username || 'admin',
    nickname: nickname || '管理员',
    avatar: '🙂',
    bio: '记录天气，也记录想法。',
    city: DEFAULT_CITY,
    // 用户是否在「个人信息」里显式设过默认城市：
    // false → 天气页优先用「上次查看的城市」；true → 用这里的 city
    citySet: false
  }
}

export const profile = reactive(defaults('', ''))

/** 读取：登录用户信息为默认值，本地保存过的覆盖其上 */
export function loadProfile() {
  const u = auth.currentUser() || {}
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    saved = {}
  }
  // 换了账号就用新账号的默认值，避免串号
  const base = defaults(u.username, u.nickname)
  if (saved.username && u.username && saved.username !== u.username) {
    Object.assign(profile, base)
    return profile
  }
  Object.assign(profile, base, saved)
  return profile
}

/** 保存：写本地 + 同步登录态里的昵称（顶栏、其他页面读 auth 时一致） */
export function saveProfile(patch) {
  Object.assign(profile, patch)
  if (Object.prototype.hasOwnProperty.call(patch, 'city')) profile.citySet = true
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...profile }))
  } catch {
    /* ignore */
  }
  auth.updateUser({ nickname: profile.nickname })
  return profile
}

/** 天气页该用哪个城市：显式设过默认城市就听它，否则用上次查看的城市 */
export function preferredCity() {
  return profile.citySet ? profile.city : ''
}