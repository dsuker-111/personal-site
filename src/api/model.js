// AI 服务 API 封装，支持三种后端（自动选择）：
//
//   1) 直连阿里云百炼（DashScope）—— 由 public/config.js 的 window.__AI_DIRECT__ 启用
//      优点：任何电脑打开网页都能用；缺点：API Key 暴露在前端（仅适合演示）
//   2) 公网代理（如 Vercel / 阿里云函数计算）—— window.__AI_API_BASE__ 指向代理
//      优点：Key 安全；缺点：需额外部署
//   3) 本机代理 http://127.0.0.1:8000（server/cloud_api.py）—— 默认
//      优点：Key 安全；缺点：仅本机可用

import { getDirectConfig, directChat } from './direct'

const IS_PROD = import.meta.env.PROD === true

const RUNTIME_BASE =
  (typeof window !== 'undefined' && window.__AI_API_BASE__) || ''
const ENV_BASE = import.meta.env.VITE_API_BASE || ''
const BASE_URL = (
  RUNTIME_BASE || ENV_BASE || (IS_PROD ? 'http://127.0.0.1:8000' : '/api')
).replace(/\/+$/, '')

export const MODEL = {
  url: BASE_URL,
  fallbackName: 'deepseek-v4.1-flash'
}

export function isDirectMode() {
  return Boolean(getDirectConfig())
}

// 健康检查：服务是否在线、当前用的是什么模型。
export async function checkHealth(timeout = 4000) {
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
    const res = await fetch(BASE_URL + '/health', { signal: controller.signal })
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
  if (getDirectConfig()) {
    const res = await directChat(prompt, options)
    return { answer: res.answer, model: res.model, raw: res }
  }

  const controller = new AbortController()
  const timeout = options.timeout || 120000
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(BASE_URL + '/chat', {
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