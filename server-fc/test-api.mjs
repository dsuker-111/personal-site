// 测试函数计算后端全部接口
const BASE = process.env.FC_URL || 'https://personasite-api-ovjtmwtnlx.cn-hangzhou.fcapp.run'
const PASSWORD = process.env.AUTH_PASSWORD || '123456'

async function j(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text.slice(0, 200)
  }
  return { status: res.status, data }
}

console.log('1) health')
const h = await j('GET', '/api/health')
console.log('  ', h.status, JSON.stringify(h.data))

console.log('2) 未授权访问 files')
const un = await j('GET', '/api/files')
console.log('  ', un.status, JSON.stringify(un.data))

console.log('3) 错误密码登录')
const bad = await j('POST', '/api/login', { password: 'wrong' })
console.log('  ', bad.status, JSON.stringify(bad.data))

console.log('4) 正确密码登录')
const login = await j('POST', '/api/login', { password: PASSWORD })
console.log('  ', login.status, JSON.stringify(login.data).slice(0, 120))
const token = login.data && login.data.token
if (!token) process.exit(1)

console.log('5) 列表（应为空）')
const list0 = await j('GET', '/api/files', null, token)
console.log('  ', list0.status, JSON.stringify(list0.data))

console.log('6) 上传测试图片')
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)
const up = await j('POST', '/api/upload', {
  name: 'test-pixel.png',
  contentType: 'image/png',
  data: png.toString('base64')
}, token)
console.log('  ', up.status, JSON.stringify(up.data))
const uploaded = up.data && up.data.file

console.log('7) 列表（应有 1 个）')
const list1 = await j('GET', '/api/files', null, token)
console.log('  ', list1.status, JSON.stringify(list1.data))

if (uploaded) {
  console.log('8) 下载该文件')
  const res = await fetch(BASE + '/api/file?path=' + encodeURIComponent(uploaded.path), {
    headers: { Authorization: 'Bearer ' + token }
  })
  const buf = Buffer.from(await res.arrayBuffer())
  console.log('   status', res.status, 'type', res.headers.get('content-type'), 'len', buf.length)
  console.log('   与上传一致:', Buffer.compare(buf, png) === 0)

  console.log('9) 删除该文件')
  const del = await j('POST', '/api/delete', { path: uploaded.path }, token)
  console.log('  ', del.status, JSON.stringify(del.data))

  console.log('10) 列表（应回到 0）')
  const list2 = await j('GET', '/api/files', null, token)
  console.log('  ', list2.status, 'files:', (list2.data.files || []).length)
}

console.log('11) AI 对话')
const ai = await j('POST', '/api/chat', { prompt: '用一句话介绍你自己', history: [] }, token)
console.log('  ', ai.status, JSON.stringify(ai.data).slice(0, 300))