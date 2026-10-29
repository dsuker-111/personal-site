// 本地模拟 Vercel Serverless 运行环境，用于验证 server-vercel/api/*.js
// 用法：node scripts/test/vercel-harness.mjs
import { createServer } from 'node:http'
import chatHandler from '../../server-vercel/api/chat.js'
import healthHandler from '../../server-vercel/api/health.js'

const PORT = 8090

function wrap(req, res) {
  // 补齐 Vercel 风格的 res.status().json() / res.send()
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(obj))
    return res
  }
  res.send = (data) => {
    res.end(data)
    return res
  }
  return res
}

const server = createServer(async (req, res) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw) {
    try {
      req.body = JSON.parse(raw)
    } catch {
      req.body = raw
    }
  }
  wrap(req, res)

  const path = new URL(req.url, 'http://x').pathname
  try {
    if (path === '/api/chat' || path === '/chat') return await chatHandler(req, res)
    if (path === '/api/health' || path === '/health') return await healthHandler(req, res)
    res.status(404).json({ error: 'not found' })
  } catch (e) {
    res.status(500).json({ error: String(e && e.message) })
  }
})

server.listen(PORT, '127.0.0.1', () => console.log('vercel-harness @ http://127.0.0.1:' + PORT))