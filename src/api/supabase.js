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