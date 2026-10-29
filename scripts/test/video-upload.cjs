// 视频/图片上传链路验证：上传 → 列表 → 下载字节比对 → 持久化
const fs = require('node:fs')
const path = require('node:path')

const BASE = process.env.FC_URL || 'https://personasite-api-ovjtmwtnlx.cn-hangzhou.fcapp.run'
const PASSWORD = process.env.AUTH_PASSWORD || '123456'

async function api(method, p, body, token) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = 'Bearer ' + token
  const res = await fetch(BASE + p, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text.slice(0, 300) }
  }
  return { status: res.status, data }
}

async function upload(name, buf, mime, token) {
  const t0 = Date.now()
  const r = await api(
    'POST',
    '/api/upload',
    { name, contentType: mime, data: buf.toString('base64') },
    token
  )
  return { ...r, ms: Date.now() - t0, size: buf.length }
}

async function main() {
  const login = await api('POST', '/api/login', { password: PASSWORD })
  const token = login.data.token
  if (!token) throw new Error('登录失败')

  const before = await api('GET', '/api/files', undefined, token)
  console.log('起始文件数:', (before.data.files || []).length)

  // 1) 真实 mp4
  const mp4Path = path.join(__dirname, '..', '..', '.tmpmedia', 'sample.mp4')
  const mp4 = fs.readFileSync(mp4Path)
  console.log(`\n1) 上传真实视频 (${(mp4.length / 1024).toFixed(0)} KB)`)
  const up = await upload('sample.mp4', mp4, 'video/mp4', token)
  console.log('   ', up.status, up.data.ok ? '✅ 成功' : '❌ ' + JSON.stringify(up.data).slice(0, 160), up.ms + 'ms')
  const file = up.data.file
  if (!file) process.exit(1)
  console.log('   kind =', file.kind, '| size =', file.size)

  // 2) 列表里能否看到
  console.log('\n2) 列表检查')
  const list = await api('GET', '/api/files', undefined, token)
  const found = (list.data.files || []).find((f) => f.path === file.path)
  console.log('   列表中可见:', found ? '✅' : '❌', found ? `(${found.name}, ${found.kind})` : '')

  // 3) 下载字节比对
  console.log('\n3) 下载内容比对')
  const res = await fetch(BASE + '/api/file?path=' + encodeURIComponent(file.path) + '&token=' + encodeURIComponent(token))
  const buf = Buffer.from(await res.arrayBuffer())
  console.log('   HTTP', res.status, '| content-type:', res.headers.get('content-type'))
  console.log('   字节数:', buf.length, '| 与源文件一致:', Buffer.compare(buf, mp4) === 0 ? '✅' : '❌')

  // 4) 不同体积的边界测试
  console.log('\n4) 体积边界测试')
  for (const mb of [1, 3, 5, 8]) {
    const size = Math.round(mb * 1024 * 1024)
    const junk = Buffer.alloc(size, 7)
    const r = await upload(`probe-${mb}mb.mp4`, junk, 'video/mp4', token)
    const ok = r.data.ok
    console.log(
      `   ${String(mb).padStart(2)}MB ->`,
      ok ? `✅ ${r.ms}ms` : `❌ ${String(r.data.error || r.data.raw).slice(0, 90)}`
    )
    if (ok) {
      await api('POST', '/api/delete', { path: r.data.file.path }, token)
    }
  }

  console.log('\n5) 保留测试视频用于浏览器验证')
  console.log('   path:', file.path)
  fs.writeFileSync(path.join(__dirname, '..', '..', '.tmpmedia', 'last-upload.json'), JSON.stringify(file, null, 2))
}

main().catch((e) => {
  console.error('异常:', e.message)
  process.exit(1)
})