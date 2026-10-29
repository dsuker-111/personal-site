// 个人信息：昵称、头像、签名、所在地、教育、职业、经历、技能、联系方式
// 存在 localStorage（按浏览器持久化），保存时同步回登录态，顶栏与主页立即生效。
import { reactive } from 'vue'
import { auth } from './auth'

const KEY = 'ps_profile'

// 可选头像：够用且不依赖任何资源文件 / 网络
export const AVATARS = ['🙂', '😎', '🐱', '🐼', '🦊', '🐳', '🍀', '🚀', '🎧', '📚', '🌙', '⚡']

export const DEGREES = ['专科', '本科', '硕士', '博士', '其他']

export const DEFAULT_CITY = '杭州'

function blankExperience() {
  return { company: '', role: '', period: '', desc: '' }
}

function defaults(username, nickname) {
  return {
    username: username || 'admin',
    nickname: nickname || '管理员',
    avatar: '🙂',
    title: '前端开发工程师',
    company: '',
    location: '',
    bio: '记录天气，也记录想法。',

    // 教育与职业
    school: '',
    major: '',
    degree: '本科',
    eduPeriod: '',
    experiences: [],

    // 技能标签
    skills: [],

    // 联系方式
    email: '',
    github: '',
    website: '',

    // 天气页
    city: DEFAULT_CITY,
    // 用户是否在「个人信息」里显式设过默认城市：
    // false → 天气页优先用「上次查看的城市」；true → 用这里的 city
    citySet: false
  }
}

export const profile = reactive(defaults('', ''))

/** 深拷贝，避免表单草稿直接改到正式数据 */
export function cloneProfile(src) {
  return JSON.parse(JSON.stringify(src))
}

/** 读取：登录用户信息为默认值，本地保存过的覆盖其上 */
export function loadProfile() {
  const u = auth.currentUser() || {}
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    saved = {}
  }

  const base = defaults(u.username, u.nickname)
  saved = migrate(base, saved)

  // 换了账号就用新账号的默认值，避免串号
  if (saved.username && u.username && saved.username !== u.username) {
    Object.assign(profile, base)
    return profile
  }
  Object.assign(profile, base, saved)
  return profile
}

/** 老版本数据里没有的字段用默认值补齐，数组统一成数组 */
function migrate(base, saved) {
  const out = { ...saved }
  for (const k of Object.keys(base)) {
    if (out[k] === undefined || out[k] === null) out[k] = base[k]
  }
  if (!Array.isArray(out.skills)) out.skills = []
  if (!Array.isArray(out.experiences)) out.experiences = []
  out.experiences = out.experiences.map((e) => ({ ...blankExperience(), ...(e || {}) }))
  return out
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

/** 名片上的一行副标题：职位 @ 公司 */
export function jobLine(p = profile) {
  if (p.title && p.company) return p.title + ' · ' + p.company
  return p.title || p.company || ''
}

/** 学历一行：学校 · 专业 · 学历 */
export function eduLine(p = profile) {
  return [p.school, p.major, p.degree].filter(Boolean).join(' · ')
}