// 验证：浮动对话框能真实对话（含中文编码链路）
const { chromium } = require('playwright')

const URL = process.env.APP_URL || 'http://localhost:5173/'

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.weather-card', { timeout: 15000 })

  await page.click('.chat-fab')
  await page.waitForSelector('.chat-window', { timeout: 8000 })

  const before = await page.$$eval('.msg', (els) => els.length)
  await page.fill('.chat-form textarea', '你好，用一句话介绍你自己')
  await page.click('.send-btn')

  // 等 AI 回复（真实气泡增加，且打字动画已消失）
  await page.waitForFunction(
    (n) =>
      document.querySelectorAll('.msg .bubble:not(.typing)').length >= n + 2 &&
      document.querySelectorAll('.msg .bubble.typing').length === 0,
    before,
    { timeout: 120000 }
  )
  await page.waitForTimeout(500)

  const msgs = await page.$$eval('.msg .bubble', (els) =>
    els.map((e) => ({ text: e.textContent.trim().slice(0, 120), typing: e.classList.contains('typing') }))
  )
  console.log(JSON.stringify(msgs, null, 2))
  console.log('状态行:', await page.$eval('.chat-status', (e) => e.textContent.trim()))

  await page.screenshot({ path: '.tmpmedia/chat-live.png' })
  await browser.close()
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})