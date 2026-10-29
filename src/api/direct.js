// 直连阿里云百炼（DashScope）OpenAI 兼容接口。
//
// ⚠️ 安全说明：此模式会把 API Key 暴露在浏览器可读的 config.js 中，
// 仅适合课程演示/个人使用。建议在阿里云控制台为该 Key 设置调用额度上限，
// 演示结束后及时吊销或轮换。
//
// 由 public/config.js 中的 window.__AI_DIRECT__ 驱动：
//   window.__AI_DIRECT__ = {
//     apiKey: 'sk-xxx',
//     baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
//     model: 'deepseek-v4.1-flash'
//   }

const SYSTEM_PROMPT =
  '你是个人网页里的 AI 助手，风格简洁、直接、友好。回答用中文，尽量条理清晰；不确定的内容要说明不确定。'

export function getDirectConfig() {
  if (typeof window === 'undefined') return null
  const cfg = window.__AI_DIRECT__
  if (!cfg || !cfg.apiKey) return null
  return {
    apiKey: cfg.apiKey,
    baseUrl: (cfg.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, ''),
    model: cfg.model || 'deepseek-v4.1-flash'
  }
}

function buildMessages(prompt, history) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
  for (const item of history || []) {
    const content = (item.content || '').trim()
    if (!content) continue
    let role = item.role
    if (role === 'ai') role = 'assistant'
    if (role !== 'user' && role !== 'assistant') continue
    messages.push({ role, content })
  }
  messages.push({ role: 'user', content: prompt })
  return messages
}

export async function directChat(prompt, options = {}) {
  const cfg = getDirectConfig()
  if (!cfg) throw new Error('未配置直连模式')

  const controller = new AbortController()
  const timeout = options.timeout || 120000
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(cfg.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + cfg.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: buildMessages(prompt, options.history),
        max_tokens: options.maxNewTokens || 512,
        temperature: options.temperature ?? 0.7,
        enable_thinking: false,
        stream: false
      }),
      signal: controller.signal
    })
    clearTimeout(timer)

    const text = await res.text()
    if (!res.ok) {
      throw new Error('阿里云接口 HTTP ' + res.status + '：' + text.slice(0, 300))
    }
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('阿里云返回非 JSON 内容')
    }
    const choice = (data.choices || [])[0] || {}
    const answer = ((choice.message || {}).content || '').trim()
    if (!answer) throw new Error('模型没有返回内容')
    return { answer, model: data.model || cfg.model }
  } finally {
    clearTimeout(timer)
  }
}