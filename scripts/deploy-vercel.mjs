// 通过 Vercel REST API 部署 AI 代理后端
// 用法：设置 VERCEL_TOKEN 与 DASHSCOPE_API_KEY 后运行
//   node scripts/deploy-vercel.mjs
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'server-vercel')
const TOKEN = (process.env.VERCEL_TOKEN || '').trim()
const DASHSCOPE_KEY = (process.env.DASHSCOPE_API_KEY || '').trim()
const PROJECT = process.env.VERCEL_PROJECT || 'personal-site-ai'
const MODEL = process.env.MODEL_NAME || 'deepseek-v4.1-flash'

if (!TOKEN) {
  console.error('缺少 VERCEL_TOKEN')
  process.exit(1)
}
if (!DASHSCOPE_KEY) {
  console.error('缺少 DASHSCOPE_API_KEY')
  process.exit(1)
}

const API = 'https://api.vercel.com'

async function call(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status} ${text.slice(0, 500)}`)
  }
  return data
}

const FILES = ['api/chat.js', 'api/health.js', 'package.json', 'vercel.json']

async function main() {
  console.log('1) 校验 token…')
  const me = await call('/v2/user')
  console.log('   账号:', me.user && (me.user.username || me.user.email))

  console.log('2) 创建/获取项目…')
  let project
  try {
    project = await call('/v11/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: PROJECT,
        framework: null,
        publicSource: false
      })
    })
    console.log('   已创建项目:', project.name, project.id)
  } catch (e) {
    if (!String(e.message).includes('409') && !/already exists/i.test(String(e.message))) throw e
    project = await call('/v9/projects/' + PROJECT)
    console.log('   项目已存在:', project.name, project.id)
  }

  console.log('3) 写入环境变量…')
  for (const [key, value] of [
    ['DASHSCOPE_API_KEY', DASHSCOPE_KEY],
    ['MODEL_NAME', MODEL]
  ]) {
    try {
      await call(`/v10/projects/${project.id}/env`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          value,
          type: 'encrypted',
          target: ['production', 'preview', 'development']
        })
      })
      console.log('   +', key)
    } catch (e) {
      const msg = String(e.message)
      if (/already exists|409/i.test(msg)) {
        console.log('   = ' + key + ' 已存在（跳过）')
      } else {
        throw e
      }
    }
  }

  console.log('4) 上传文件并创建部署…')
  const files = []
  for (const f of FILES) {
    const content = await readFile(join(ROOT, f), 'utf8')
    files.push({ file: f, data: content })
  }

  const deployment = await call('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: PROJECT,
      project: project.id,
      files,
      target: 'production',
      projectSettings: {
        framework: null,
        buildCommand: null,
        outputDirectory: null
      }
    })
  })
  console.log('   部署 ID:', deployment.id)

  console.log('5) 等待部署完成…')
  let state = deployment.readyState || 'QUEUED'
  let info = deployment
  for (let i = 0; i < 60; i++) {
    if (state === 'READY' || state === 'ERROR' || state === 'CANCELED') break
    await new Promise((r) => setTimeout(r, 3000))
    info = await call('/v13/deployments/' + deployment.id)
    state = info.readyState
    process.stdout.write(`   ${state}\r`)
  }

  if (state !== 'READY') {
    console.error('\n部署未成功:', state)
    if (info.aliasError) console.error(info.aliasError)
    process.exit(1)
  }

  const host = info.url
  console.log('\n✅ 部署成功')
  console.log('   后端地址: https://' + host)
  console.log('   前端 API 基址请设为: https://' + host + '/api')
  console.log('   健康检查: https://' + host + '/api/health')
}

main().catch((e) => {
  console.error('部署失败:', e.message)
  process.exit(1)
})