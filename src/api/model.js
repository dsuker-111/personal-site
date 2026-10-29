// AI 服务封装。优先级：
//   1) 后端（函数计算）—— public/config.js 的 __API_BASE__，API Key 只在服务端
//   2) 浏览器直连阿里云 —— __AI_DIRECT__，Key 在前端（仅演示用）
//   3) 本机代理 http://127.0.0.1:8000（server/cloud_api.py）

import { getDirectConfig, directChat } from './direct'
import { request, HAS_BACKEND, API_BASE } from './http'
import { LOCAL_ID, localBase } from './models'

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

// 发送对话。options: { model, maxNewTokens, temperature, history, timeout }
// model 为 local:qwen-lora 时调用本机服务，其余走云端后端。
export async function chat(prompt, options = {}) {
  if (options.model === LOCAL_ID) {
    return chatLocal(prompt, options)
  }

  if (HAS_BACKEND) {
    const d = await request('/api/chat', {
      method: 'POST',
      body: {
        prompt,
        history: options.history || [],
        model: options.model || undefined
      },
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

// 调用 TRAE 训练好的本地模型（server/web_api.py）
async function chatLocal(prompt, options = {}) {
  const base = localBase()
  if (!base) throw new Error('未配置本地模型地址（config.js 的 __LOCAL_MODEL__）')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout || 120000)
  try {
    const res = await fetch(base + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        history: options.history || [],
        max_new_tokens: options.maxNewTokens ?? 320,
        temperature: options.temperature ?? 0.7
      }),
      signal: controller.signal
    })
    if (!res.ok) throw new Error('本地模型返回 HTTP ' + res.status)
    const data = await res.json()
    if (data && data.error) throw new Error(data.error)
    return {
      answer: (data && data.answer) || '',
      model: 'qwen2.5-0.5b + lora_qa',
      local: true,
      raw: data
    }
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('本地模型响应超时')
    if (err instanceof TypeError) {
      throw new Error('无法连接本地模型服务，请先运行 python server/web_api.py')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}