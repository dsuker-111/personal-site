// 浅色主题检查：登录页 / 主页 / 对话框 / 资源库 / 个人信息 / 模型自检弹窗
const { chromium } = require('playwright')

const URL = process.env.APP_URL || 'http://localhost:5173/'

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.login-card')
  await page.waitForTimeout(500)
  await page.screenshot({ path: '.tmpmedia/light-login.png' })
  const loginBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  console.log('1) 登录页 body 背景:', loginBg)

  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: '.tmpmedia/light-home.png' })

  const top = await page.evaluate(() => {
    const t = document.querySelector('.topbar')
    const h = document.querySelector('.hero h2')
    return {
      body: getComputedStyle(document.body).backgroundColor,
      topbar: getComputedStyle(t).backgroundColor,
      topbarColor: getComputedStyle(t).color,
      heroColor: getComputedStyle(h).color
    }
  })
  console.log('2) 主页配色:', JSON.stringify(top))

  // 对话框
  await page.click('.chat-fab')
  await page.waitForSelector('.chat-window', { timeout: 8000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: '.tmpmedia/light-chat.png' })
  console.log('3) 对话框已开')

  // 资源库
  await page.goto(URL + '#/library', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.dropzone', { timeout: 20000 })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: '.tmpmedia/light-library.png' })

  // 个人信息
  await page.goto(URL + '#/profile', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pf-preview', { timeout: 15000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: '.tmpmedia/light-profile.png' })

  // 手机端主页
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await m.goto(URL, { waitUntil: 'domcontentloaded' })
  await m.fill('input[autocomplete="username"]', 'admin')
  await m.fill('input[autocomplete="current-password"]', '123456')
  await m.click('.login-btn')
  await m.waitForSelector('.wx-temp', { timeout: 20000 })
  await m.waitForTimeout(2000)
  await m.screenshot({ path: '.tmpmedia/light-mobile.png' })

  console.log('4) 手机端横向溢出:', await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
  await browser.close()
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})