// 线上端到端验证：登录（真实后端）→ 资源库 → 上传 → 列表 → AI 对话
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const SITE = process.env.SITE_URL || 'https://personal-site-ai.surge.sh'
const USER = 'admin'
const PASS = '123456'
const OUT = path.join(__dirname, '..', '..', 'shots')

async function main() {
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const page = await ctx.newPage()

  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160))
  })
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)))

  console.log('1) 打开首页', SITE)
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1200)
  const url1 = page.url()
  console.log('   当前地址:', url1)
  if (!url1.includes('login')) console.log('   注意：未跳转到登录页')

  console.log('2) 登录', USER)
  await page.fill('input[type="text"]', USER)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2500)
  console.log('   登录后地址:', page.url())

  const loggedIn = !page.url().includes('login')
  console.log('   登录成功:', loggedIn)
  await page.screenshot({ path: path.join(OUT, 'live-home.png') })

  // 检查 AI 在线状态
  const statusText = await page.textContent('body').catch(() => '')
  console.log('   页面含“模型”:', /模型/.test(statusText))
  console.log('   页面含“离线/不可用”:', /离线|不可用|未连接/.test(statusText))

  console.log('3) 进入资源库')
  await page.goto(SITE + '/#/library', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2500)
  const hasTitle = await page.locator('text=我的资源库').count()
  console.log('   资源库标题存在:', hasTitle > 0)
  await page.screenshot({ path: path.join(OUT, 'live-library.png'), fullPage: true })

  console.log('4) 上传测试图片')
  const tmp = path.join(os.tmpdir(), 'e2e-upload.png')
  // 生成一张纯色 PNG（1x1 放大由浏览器显示）
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAWklEQVR42u3OMQEAAAgDoJnc6BpjDyQgdWXm5wEECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBDwewE1lQGBHOAO4wAAAABJRU5ErkJggg==',
    'base64'
  )
  fs.writeFileSync(tmp, png)

  const input = page.locator('input[type="file"]')
  await input.setInputFiles(tmp)
  await page.waitForTimeout(6000)
  await page.screenshot({ path: path.join(OUT, 'live-library-upload.png'), fullPage: true })

  const cards = await page.locator('.card').count()
  const empty = await page.locator('.empty').count()
  console.log('   卡片数量:', cards, ' 空状态:', empty)

  const toast = await page.locator('.toast').textContent().catch(() => '')
  if (toast) console.log('   提示:', toast.trim())

  const alert = await page.locator('.alert').textContent().catch(() => '')
  if (alert) console.log('   ⚠️ 错误提示:', alert.trim())

  console.log('5) 控制台错误')
  console.log('   ', errors.length ? errors.slice(0, 5).join(' | ') : '无')

  await browser.close()

  const ok = loggedIn && cards > 0 && !alert
  console.log('\n结果:', ok ? '✅ 通过' : '❌ 未完全通过')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error('测试异常:', e.message)
  process.exit(1)
})