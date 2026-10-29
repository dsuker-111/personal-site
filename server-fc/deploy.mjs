// 部署 Python 后端到阿里云函数计算 FC 3.0，并创建公网 HTTP 触发器
import crypto from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'server-fc')

const AK = process.env.ALI_AK
const SK = process.env.ALI_SK
const ACCOUNT = process.env.ALI_ACCOUNT || '1031592721890150'
const REGION = process.env.ALI_REGION || 'cn-hangzhou'
const FN = process.env.FC_FUNCTION || 'personal-site-api'

if (!AK || !SK) {
  console.error('缺少 ALI_AK / ALI_SK')
  process.exit(1)
}

const sha256Hex = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')
const enc = (s) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

async function acs3(method, path, body = '', query = {}) {
  const host = `${ACCOUNT}.${REGION}.fc.aliyuncs.com`
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const qs = Object.keys(query)
    .sort()
    .map((k) => `${enc(k)}=${enc(String(query[k]))}`)
    .join('&')
  const headers = {
    host,
    'x-acs-date': date,
    'x-acs-signature-nonce': crypto.randomUUID(),
    'x-acs-version': '2023-03-30',
    'x-acs-content-sha256': sha256Hex(body)
  }
  if (body) headers['content-type'] = 'application/json'
  const keys = Object.keys(headers).sort()
  const ch = keys.map((k) => `${k}:${String(headers[k]).trim()}\n`).join('')
  const sh = keys.join(';')
  const cr = [method, path, qs, ch, sh, sha256Hex(body)].join('\n')
  const sts = `ACS3-HMAC-SHA256\n${sha256Hex(cr)}`
  const sig = crypto.createHmac('sha256', SK).update(sts, 'utf8').digest('hex')
  const res = await fetch(`https://${host}${path}${qs ? '?' + qs : ''}`, {
    method,
    headers: {
      ...headers,
      Authorization: `ACS3-HMAC-SHA256 Credential=${AK},SignedHeaders=${sh},Signature=${sig}`
    },
    body: method === 'GET' ? undefined : body
  })
  return { status: res.status, text: await res.text() }
}

function makeZip() {
  const py = process.env.PYTHON || 'python'
  const zipPath = join(SRC, 'code.zip')
  execFileSync(py, [
    '-c',
    `import zipfile,os;os.chdir(r'${SRC}');z=zipfile.ZipFile('code.zip','w',zipfile.ZIP_DEFLATED);z.write('index.py');z.close()`
  ])
  if (!existsSync(zipPath)) throw new Error('zip 生成失败')
  return readFileSync(zipPath)
}

function env(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`缺少环境变量 ${name}`)
    process.exit(1)
  }
  return v
}

const ENV_VARS = {
  GITHUB_TOKEN: env('GITHUB_TOKEN'),
  GITHUB_OWNER: process.env.GITHUB_OWNER || 'dsuker-111',
  GITHUB_REPO: process.env.GITHUB_REPO || 'dsuker-media',
  GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',
  AUTH_PASSWORD: env('AUTH_PASSWORD'),
  AUTH_SECRET: env('AUTH_SECRET'),
  DASHSCOPE_API_KEY: env('DASHSCOPE_API_KEY'),
  MODEL_NAME: process.env.MODEL_NAME || 'deepseek-v4.1-flash'
}

console.log('1) 打包代码')
const zip = makeZip()
console.log('   code.zip', zip.length, 'bytes')

const fnBody = JSON.stringify({
  functionName: FN,
  runtime: 'python3.10',
  handler: 'index.handler',
  memorySize: 512,
  timeout: 120,
  environmentVariables: ENV_VARS,
  code: { zipFile: zip.toString('base64') },
  description: '个人网站后端：资源库 + AI 对话'
})

console.log('2) 创建/更新函数', FN)
let r = await acs3('POST', '/2023-03-30/functions', fnBody)
if (r.status === 200) {
  console.log('   已创建')
} else {
  console.log('   创建返回', r.status, r.text.slice(0, 200))
  r = await acs3('PUT', `/2023-03-30/functions/${FN}`, fnBody)
  console.log('   更新返回', r.status, r.status === 200 ? 'OK' : r.text.slice(0, 300))
}

console.log('3) 创建 HTTP 触发器')
// FC 3.0 要求 triggerConfig 为「JSON 字符串」而非对象
const triggerBody = JSON.stringify({
  triggerName: 'http',
  triggerType: 'http',
  triggerConfig: JSON.stringify({
    authType: 'anonymous',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH']
  })
})
let t = await acs3('POST', `/2023-03-30/functions/${FN}/triggers`, triggerBody)
if (t.status !== 200) {
  console.log('   创建返回', t.status, t.text.slice(0, 200))
  t = await acs3('PUT', `/2023-03-30/functions/${FN}/triggers/http`, triggerBody)
  console.log('   更新返回', t.status, t.status === 200 ? 'OK' : t.text.slice(0, 300))
}

console.log('4) 读取公网地址')
const g = await acs3('GET', `/2023-03-30/functions/${FN}/triggers/http`)
let url = ''
try {
  const j = JSON.parse(g.text)
  url = (j.httpTrigger && (j.httpTrigger.urlInternet || j.httpTrigger.urlIntranet)) || ''
  console.log('   触发器状态:', JSON.stringify(j.httpTrigger || {}).slice(0, 300))
} catch {
  console.log('   解析失败:', g.text.slice(0, 200))
}

if (url) {
  writeFileSync(join(ROOT, 'server-fc', 'api-url.txt'), url + '\n', 'utf8')
  console.log('\n✅ 后端地址:', url)
} else {
  console.log('\n⚠️ 未取到公网地址，请到控制台查看触发器')
}