// 验证线上主页个人资料卡挂载：登录 → 主页有 .pcard → 数据来自当前账号
const { chromium } = require('playwright')
const APP_URL = process.env.APP_URL || 'https://personal-site-ai.surge.sh/'

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 960, height: 1400 } })
  const page = await context.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 120)) })

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForTimeout(4000)

  await page.waitForSelector('.pcard', { timeout: 20000 }).catch(() => {})
  const hasCard = await page.evaluate(() => !!document.querySelector('.pcard'))
  const nicknameInCard = await page.evaluate(() => document.querySelector('.pcard-name h2')?.textContent.trim() || '')
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('.pcard .pcard-title')].map((e) => e.textContent.replace(/\s+/g, '').trim())
  )
  console.log('主页个人资料卡存在:', hasCard)
  console.log('卡上昵称:', nicknameInCard)
  console.log('卡上区块:', blocks.join(' / ') || '(未填资料，仅显示基础项)')
  await page.screenshot({ path: '.tmpmedia/live-home-profile.png', fullPage: true })
  await browser.close()
})().catch((e) => { console.error('失败:', e.message); process.exit(1) })