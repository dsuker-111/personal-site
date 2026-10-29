// AI 服务 API 封装。
//
// 支持两种后端（契约一致，前端无感切换）：
//   1) server/cloud_api.py —— 阿里云百炼 deepseek-v4.1-flash 代理（推荐/默认）
//   2) server/web_api.py   —— 本地 TRAE 训练模型 Qwen2.5-0.5B-Instruct + LoRA
//
// 安全：API Key 只存在于本机服务端环境变量，前端不接触。
// 开发环境经 vite 代理 /api 转发；生产（GitHub Pages 静态站）直连本机 127.0.0.1:8000
// （127.0.0.1 属浏览器 loopback 信任域，HTTPS 页面亦可调用）。

const IS_PROD = import.meta.env.PROD === true

// API 地址优先级：
//   1) 运行时注入 window.__AI_API_BASE__（public/config.js，部署后可直接改）
//   2) 构建时环境变量 VITE_API_BASE（可用于指向云端代理，如 https://xxx.onrender.com）
//   3) 开发环境走 vite 代理 /api；生产默认本机 127.0.0.1:8000
const RUNTIME_BASE =
  (typeof window !== 'undefined' && window.__AI_API_BASE__) || ''
const ENV_BASE = import.meta.env.VITE_API_BASE || ''
const BASE_URL = (RUNTIME_BASE || ENV_BASE || (IS_PROD ? 'http://127.0.0.1:8000' : '/api')).replace(/\/+$/, '')

export const MODEL = {
  url: BASE_URL,
  fallbackName: 'deepseek-v4.1-flash'
}

// 健康检查：服务是否在线、当前用的是什么模型。
export async function checkHealth(timeout = 4000) {
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
      keyConfigured: data.key_configured !== false
    }
  } catch {
    clearTimeout(timer)
    return { online: false }
  }
}

// 发送对话。options: { maxNewTokens, temperature, history, timeout }
export async function chat(prompt, options = {}) {
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
    if (data && data.error) {
      throw new Error(data.error)
    }
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