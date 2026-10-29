// Vercel Serverless：健康检查
const MODEL_NAME = process.env.MODEL_NAME || 'deepseek-v4.1-flash'
const BASE_URL = (process.env.DASHSCOPE_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '')
const API_KEY = (process.env.DASHSCOPE_API_KEY || '').trim()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  res.status(200).json({
    status: 'ok',
    provider: 'aliyun-dashscope',
    model: MODEL_NAME,
    base_url: BASE_URL,
    key_configured: Boolean(API_KEY)
  })
}