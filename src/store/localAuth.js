// 本地账号：邮箱 + 密码，全部存在浏览器 localStorage，不依赖任何网络。
// 用于云端（Supabase）不可达时的降级登录，保证离线也能演示「登录 → 编辑资料」。
const USERS_KEY = 'ps_local_users'
const SESSION_KEY = 'ps_local_session'

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) || {} : {}
  } catch {
    return {}
  }
}

function writeUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)) } catch {}
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {}
}

function randomSalt() {
  try {
    const buf = new Uint8Array(16)
    crypto.getRandomValues(buf)
    return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return String(Math.random()).slice(2) + Date.now().toString(16)
  }
}

// SHA-256（HTTPS / localhost 下可用）；极端环境退回简单散列
async function hashPassword(password, salt) {
  const text = salt + ':' + password
  try {
    if (globalThis.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch {}
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return 'x' + h.toString(16)
}

function normalize(email) {
  return String(email || '').trim().toLowerCase()
}

/** 本机是否已有任何本地账号 */
export function hasLocalUsers() {
  return Object.keys(readUsers()).length > 0
}

/** 本机是否已有该邮箱的本地账号 */
export function hasLocalAccount(email) {
  return Boolean(readUsers()[normalize(email)])
}

/** 当前本地登录会话 */
export function localSession() {
  const s = readSession()
  if (!s || !s.email) return null
  const users = readUsers()
  if (!users[s.email]) return null
  return {
    email: s.email,
    uid: null,
    nickname: users[s.email].nickname || s.email.split('@')[0],
    mode: 'local',
    ts: s.ts || Date.now()
  }
}

/** 本地注册 */
export async function registerLocal(email, password) {
  const mail = normalize(email)
  if (!mail || !mail.includes('@')) throw new Error('请输入正确的邮箱')
  if (!password || password.length < 6) throw new Error('密码至少 6 位')

  const users = readUsers()
  if (users[mail]) throw new Error('该邮箱已在本机注册，请直接登录')

  const salt = randomSalt()
  const hash = await hashPassword(password, salt)
  users[mail] = {
    email: mail,
    salt,
    hash,
    nickname: mail.split('@')[0],
    createdAt: new Date().toISOString()
  }
  writeUsers(users)

  const user = { email: mail, uid: null, nickname: users[mail].nickname, mode: 'local', ts: Date.now() }
  writeSession(user)
  return { user }
}

/** 本地登录 */
export async function loginLocal(email, password) {
  const mail = normalize(email)
  const users = readUsers()
  const rec = users[mail]
  if (!rec) throw new Error('本机没有这个账号，请先点「注册」创建本地账号')

  const hash = await hashPassword(password, rec.salt)
  if (hash !== rec.hash) throw new Error('密码错误')

  const user = { email: mail, uid: null, nickname: rec.nickname || mail.split('@')[0], mode: 'local', ts: Date.now() }
  writeSession(user)
  return { user }
}

/** 退出本地登录 */
export function logoutLocal() {
  writeSession(null)
}

/** 改本地昵称（跟随资料编辑同步） */
export function updateLocalNickname(email, nickname) {
  const mail = normalize(email)
  const users = readUsers()
  if (users[mail]) {
    users[mail].nickname = nickname || users[mail].nickname
    writeUsers(users)
  }
}
