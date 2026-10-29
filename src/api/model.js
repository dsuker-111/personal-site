// AI 服务封装。优先级：
//   1) 后端（函数计算）—— public/config.js 的 __API_BASE__，API Key 只在服务端
//   2) 浏览器直连阿里云 —— __AI_DIRECT__，Key 在前端（仅演示用）
//   3) 本机代理 http://127.0.0.1:8000（server/cloud_api.py）

import { getDirectConfig, directChat } from './direct'
import { request, HAS_BACKEND, API_BASE } from './http'

const IS_PROD = import.meta.env.PROD === true

const LEGACY_BASE = ((
  (typeof window !== 'undefined' && window.__AI_API_BASE__) ||
  import.meta.env.VITE_API_BASE ||
  (IS_PROD ? 'http://127.0.0.1:8000' : '/api')
) || '').replace(/\/+$/, '')

export const MODEL = {
  url: HAS_BACKEND ? API_BASE : LEGACY_BASE,
  fallbackName: 'deepseek-v4.1-flash'
}

export function isDirectMode() {
  return !HAS_BACKEND && Boolean(getDirectConfig())
}

// 健康检查：后端在线、当前模型、Key 是否已配置
export async function checkHealth(timeout = 8000) {
  if (HAS_BACKEND) {
    try {
      const d = await request('/api/health', { auth: false, timeout })
      return {
        online: d.status === 'ok',
        model: d.model || MODEL.fallbackName,
        provider: 'aliyun-dashscope',
        keyConfigured: d.ai_configured !== false,
        mode: 'backend'
      }
    } catch {
      return { online: false }
    }
  }

  const direct = getDirectConfig()
  if (direct) {
    return {
      online: true,
      model: direct.model,
      provider: 'aliyun-dashscope',
      keyConfigured: true,
      mode: 'direct'
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(LEGACY_BASE + '/health', { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return { online: false }
    const data = await res.json().catch(() => ({}))
    return {
      online: true,
      model: data.model || MODEL.fallbackName,
      provider: data.provider || '',
      keyConfigured: data.key_configured !== false,
      mode: 'proxy'
    }
  } catch {
    clearTimeout(timer)
    return { online: false }
  }
}

// 发送对话。options: { maxNewTokens, temperature, history, timeout }
export async function chat(prompt, options = {}) {
  if (HAS_BACKEND) {
    const d = await request('/api/chat', {
      method: 'POST',
      body: { prompt, history: options.history || [] },
      timeout: options.timeout || 120000
    })
    return { answer: d.answer || '', model: d.model || MODEL.fallbackName, raw: d }
  }

  if (getDirectConfig()) {
    const res = await directChat(prompt, options)
    return { answer: res.answer, model: res.model, raw: res }
  }

  const controller = new AbortController()
  const timeout = options.timeout || 120000
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(LEGACY_BASE + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        max_tokens: options.maxNewTokens ?? 512,
        max_new_tokens: options.maxNewTokens ?? 512,
        temperature: options.temperature ?? 0.7,
        history: options.history || []
      }),
      signal: controller.signal
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    if (data && data.error) throw new Error(data.error)
    return {
      answer: (data && data.answer) || '',
      model: (data && data.model) || MODEL.fallbackName,
      raw: data
    }
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}