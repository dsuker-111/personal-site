// 本地模型服务 API 封装。
// 模型由 TRAE 训练：Qwen2.5-0.5B-Instruct + LoRA（lora_qa）。
// 本地启动 server/web_api.py 后监听 http://127.0.0.1:8000。
//
// 开发环境使用 vite 代理（vite.config.js）通过 /api 转发，规避跨域；
// 生产部署（GitHub Pages 静态站）没有 /api 代理，故直接请求 127.0.0.1:8000
//（web_api.py 已开启 CORS，允许跨域调用本机模型服务）。

const IS_PROD = import.meta.env.PROD === true
// 生产直连本地模型；开发走 vite 代理
const BASE_URL = IS_PROD ? 'http://127.0.0.1:8000' : '/api'

export const MODEL = {
  baseHint: 'Qwen2.5-0.5B-Instruct + LoRA (lora_qa)',
  url: 'http://127.0.0.1:8000'
}

// 健康检查：模型服务是否在线。
export async function checkHealth(timeout = 4000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(BASE_URL + '/health', { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) return { online: true, ...(await res.json().catch(() => ({})) ) }
    return { online: false }
  } catch {
    clearTimeout(timer)
    return { online: false }
  }
}

// 发送对话。options: { max_new_tokens, temperature }
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
        max_new_tokens: options.max_new_tokens ?? 320,
        temperature: options.temperature ?? 0.2,
        history: options.history || []
      }),
      signal: controller.signal
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    return {
      answer: (data && data.answer) || '',
      raw: data
    }
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}