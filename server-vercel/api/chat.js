// Vercel Serverless：阿里云百炼 deepseek-v4.1-flash 代理
// 环境变量（在 Vercel 项目设置里配置）：
//   DASHSCOPE_API_KEY   必填
//   MODEL_NAME          可选，默认 deepseek-v4.1-flash
//   DASHSCOPE_BASE_URL  可选，默认 https://dashscope.aliyuncs.com/compatible-mode/v1

const BASE_URL = (process.env.DASHSCOPE_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '')
const MODEL_NAME = process.env.MODEL_NAME || 'deepseek-v4.1-flash'
const API_KEY = (process.env.DASHSCOPE_API_KEY || '').trim()

const SYSTEM_PROMPT =
  '你是个人网页里的 AI 助手，风格简洁、直接、友好。回答用中文，尽量条理清晰；不确定的内容要说明不确定。'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '600')
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

export default async function handler(req, res) {
  cors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      provider: 'aliyun-dashscope',
      model: MODEL_NAME,
      base_url: BASE_URL,
      key_configured: Boolean(API_KEY)
    })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      res.status(400).json({ answer: '', error: '请求体不是合法 JSON' })
      return
    }
  }
  body = body || {}

  const prompt = String(body.prompt || '').trim()
  if (!prompt) {
    res.status(200).json({ answer: '', model: MODEL_NAME })
    return
  }

  if (!API_KEY) {
    res.status(200).json({
      answer: '',
      model: MODEL_NAME,
      error: '服务端未配置 DASHSCOPE_API_KEY'
    })
    return
  }

  const payload = {
    model: MODEL_NAME,
    messages: buildMessages(prompt, body.history),
    max_tokens: Number(body.max_tokens || body.max_new_tokens || 512),
    temperature: Number(body.temperature ?? 0.7),
    // deepseek-v4.1-flash 默认开启推理，会消耗大量 reasoning tokens 且变慢；
    // 个人助手场景关闭思考，响应更快、内容更直接。
    enable_thinking: false,
    stream: false
  }

  try {
    const upstream = await fetch(BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const text = await upstream.text()
    if (!upstream.ok) {
      res.status(200).json({
        answer: '',
        model: MODEL_NAME,
        error: '阿里云接口 HTTP ' + upstream.status + '：' + text.slice(0, 500)
      })
      return
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      res.status(200).json({ answer: '', model: MODEL_NAME, error: '阿里云返回非 JSON' })
      return
    }

    const choice = (data.choices || [])[0] || {}
    const answer = ((choice.message || {}).content || '').trim()
    if (!answer) {
      res.status(200).json({
        answer: '',
        model: MODEL_NAME,
        error: '阿里云返回内容为空：' + text.slice(0, 300)
      })
      return
    }

    res.status(200).json({ answer, model: MODEL_NAME })
  } catch (err) {
    res.status(200).json({
      answer: '',
      model: MODEL_NAME,
      error: '调用阿里云失败：' + (err && err.message ? err.message : String(err))
    })
  }
}