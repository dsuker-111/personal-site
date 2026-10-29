// 截图验证：登录后主页 = 天气主界面 + 右下角 AI 浮动对话框
const { chromium } = require('playwright')

const URL = process.env.APP_URL || 'http://127.0.0.1:5173/'
const OUT = process.env.OUT_DIR || '.tmpmedia'

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
  })

  await page.goto(URL, { waitUntil: 'networkidle' })
  console.log('路由:', page.url())

  // 登录
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.weather-card', { timeout: 15000 })
  console.log('已进入主页，天气卡片已出现')

  // 等天气数据回来（城市名 + 温度）
  await page.waitForFunction(() => {
    const t = document.querySelector('.wx-temp')
    return t && t.textContent.trim().length > 0
  }, { timeout: 20000 }).catch(() => console.log('警告：温度未渲染'))

  const data = await page.evaluate(() => ({
    city: document.querySelector('.wx-city span')?.textContent,
    temp: document.querySelector('.wx-temp')?.textContent.trim(),
    desc: document.querySelector('.wx-desc')?.textContent.trim(),
    days: [...document.querySelectorAll('.wx-day')].map((d) => d.textContent.replace(/\s+/g, ' ').trim()),
    foot: document.querySelector('.wx-foot')?.textContent.trim(),
    err: document.querySelector('.wx-error')?.textContent.trim() || '',
    fab: document.querySelector('.chat-fab')?.textContent.trim()
  }))
  console.log(JSON.stringify(data, null, 2))

  await page.screenshot({ path: OUT + '/home-weather.png', fullPage: false })

  // 打开 AI 对话框
  await page.click('.chat-fab')
  await page.waitForSelector('.chat-window', { timeout: 8000 })
  await page.waitForTimeout(1200)
  const chat = await page.evaluate(() => ({
    visible: !!document.querySelector('.chat-window'),
    model: document.querySelector('#model-select')?.value,
    status: document.querySelector('.chat-status')?.textContent.trim(),
    bubble: document.querySelectorAll('.msg').length
  }))
  console.log('对话框:', JSON.stringify(chat))

  await page.screenshot({ path: OUT + '/home-chat-open.png' })

  // Esc 关闭
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  console.log('Esc 后窗口存在:', await page.$('.chat-window') !== null)

  console.log('JS 报错:', errors.length ? errors : '无')
  await browser.close()
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})