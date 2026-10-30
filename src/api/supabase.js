// Supabase 客户端 · 两个站共享同一个项目
import { createClient } from '@supabase/supabase-js'

const URL = 'https://dvkbgbylwlomjevfckcj.supabase.co'
const KEY = 'sb_publishable_4Zm9p0KB-Rst6J9StoVZaA_GOgs4N8r'

export const supabase = createClient(URL, KEY)

// 判断是否已登录
export async function isLoggedIn() {
  const { data } = await supabase.auth.getSession()
  return !!(data && data.session)
}

// 当前用户 ID
export async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  return (data && data.session && data.session.user && data.session.user.id) || null
}

// 当前用户邮箱
export async function currentUserEmail() {
  const { data } = await supabase.auth.getSession()
  return (data && data.session && data.session.user && data.session.user.email) || null
}

// 登录
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// 注册
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

// 退出
export async function signOut() {
  await supabase.auth.signOut()
}

// ====== 个人资料读写 ======

// 把数据库行的 JSON 文本字段还原成结构
function decodeProfileRow(data) {
  if (!data) return null
  const out = { ...data }
  try { out.education = JSON.parse(out.education || '{}') } catch { out.education = {} }
  try { out.skills = JSON.parse(out.skills || '[]') } catch { out.skills = [] }
  try { out.sites = JSON.parse(out.sites || '[]') } catch { out.sites = [] }
  try { out.devices = JSON.parse(out.devices || '[]') } catch { out.devices = [] }
  try { out.experiences = JSON.parse(out.experiences || '[]') } catch { out.experiences = [] }
  return out
}

/** 读取登录用户本人的资料 */
export async function loadProfileFromDB() {
  const uid = await currentUserId()
  if (!uid) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
  if (error || !data) return null
  return decodeProfileRow(data)
}

/** 读取公开资料（未登录 / 访客用）：取第一条有内容的记录作为公开名片 */
export async function loadPublicProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return decodeProfileRow(data)
}

/** 保存个人资料 */
export async function saveProfileToDB(profile) {
  const uid = await currentUserId()
  if (!uid) return
  const row = {
    id: uid,
    nickname: profile.nickname || '',
    avatar: profile.avatar || '',
    bio: profile.bio || '',
    location: profile.location || '',
    job: profile.title || '',
    company: profile.company || '',
    education: JSON.stringify({
      school: profile.school || '',
      major: profile.major || '',
      degree: profile.degree || '',
      period: profile.eduPeriod || ''
    }),
    skills: JSON.stringify(profile.skills || []),
    sites: JSON.stringify(profile.sites || []),
    devices: JSON.stringify(profile.devices || []),
    experiences: JSON.stringify(profile.experiences || []),
    updated_at: new Date().toISOString()
  }
  try {
    await supabase.from('profiles').upsert(row)
  } catch { /* ignore */ }
}