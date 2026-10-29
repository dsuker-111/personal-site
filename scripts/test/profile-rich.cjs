// 验证：富个人信息（教育 / 职业 / 经历 / 技能 / 联系方式）填写 → 保存 → 持久化
const { chromium } = require('playwright')

const URL = process.env.APP_URL || 'http://localhost:5173/'

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })

  await page.click('.user-chip')
  await page.click('.um-item:has-text("个人信息")')
  await page.waitForSelector('.pf-form', { timeout: 10000 })

  // 基本信息
  await page.fill('input[maxlength="12"]', '天气达人')
  await page.fill('input[placeholder="如 杭州"]', '杭州')
  await page.fill('textarea[placeholder*="一句话介绍自己"]', '前端 + AI，喜欢把想法做成能用的东西。')
  await page.click('.pf-avatar-opt >> nth=2') // 🐱

  // 教育与职业
  await page.fill('input[placeholder="如 浙江大学"]', '浙江大学')
  await page.fill('input[placeholder="如 软件工程"]', '软件工程')
  await page.selectOption('.pf-form select', '硕士')
  await page.fill('input[placeholder="如 2021 - 2025"]', '2021 - 2025')
  await page.locator('.pf-form input[placeholder="如 某某科技"]').first().fill('某某科技')
  await page.fill('input[placeholder="如 前端开发工程师"]', '前端开发工程师')

  // 职业经历两条
  await page.click('.pf-add')
  await page.fill('.pf-exp >> nth=0 >> input[placeholder="如 某某科技"]', '某某科技')
  await page.fill('.pf-exp >> nth=0 >> input[placeholder="如 前端实习生"]', '前端实习生')
  await page.fill('.pf-exp >> nth=0 >> input[placeholder*="2024.06"]', '2024.06 - 2024.09')
  await page.fill('.pf-exp >> nth=0 >> textarea', '参与资源库模块开发，负责上传与预览。')

  await page.click('.pf-add')
  await page.fill('.pf-exp >> nth=1 >> input[placeholder="如 某某科技"]', '开源社区')
  await page.fill('.pf-exp >> nth=1 >> input[placeholder="如 前端实习生"]', 'Contributor')
  await page.fill('.pf-exp >> nth=1 >> input[placeholder*="2024.06"]', '2023.01 - 至今')
  await page.fill('.pf-exp >> nth=1 >> textarea', '给 Vue 生态提过几个小 PR。')

  // 技能
  for (const s of ['Vue 3', 'Python', 'PyTorch']) {
    await page.fill('.pf-skill-input input', s)
    await page.press('.pf-skill-input input', 'Enter')
  }

  // 联系方式
  await page.fill('input[type="email"]', 'me@example.com')
  await page.fill('input[placeholder="github.com/yourname"]', 'github.com/dsuker-111')
  await page.fill('input[placeholder="https://…"]', 'personal-site-ai.surge.sh')

  // 默认城市
  await page.fill('input[list="pf-city-list"]', '成都')

  await page.waitForTimeout(400)
  const preview = await page.$eval('.pf-preview', (e) => e.innerText.replace(/\s+/g, ' ').trim())
  console.log('1) 名片预览:\n   ' + preview)
  await page.screenshot({ path: '.tmpmedia/profile-rich.png', fullPage: true })

  // 保存
  await page.click('.pf-btn.primary')
  await page.waitForSelector('.pf-toast', { timeout: 5000 })
  console.log('2) 保存提示:', await page.$eval('.pf-toast', (e) => e.textContent.trim()))
  await page.waitForFunction(() => location.hash === '#/' || location.hash === '', { timeout: 8000 })
  await page.waitForSelector('.wx-temp', { timeout: 20000 })
  await page.waitForTimeout(1500)
  console.log('3) 主页:', JSON.stringify(await page.evaluate(() => ({
    hello: document.querySelector('.hero h2')?.textContent.trim(),
    name: document.querySelector('.user-chip .user-name')?.textContent.trim(),
    city: document.querySelector('.wx-city span')?.textContent.trim()
  }))))

  // 下拉里的职位行
  await page.click('.user-chip')
  await page.waitForSelector('.user-dropdown')
  console.log('4) 下拉:', await page.$eval('.um-id', (e) => e.innerText.replace(/\s+/g, ' ').trim()))

  // 刷新后重新进个人信息，确认持久化
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.wx-temp', { timeout: 20000 })
  await page.goto(URL + '#/profile', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pf-form', { timeout: 15000 })
  await page.waitForTimeout(500)
  const reloaded = await page.evaluate(() => ({
    school: document.querySelector('input[placeholder="如 浙江大学"]')?.value,
    degree: document.querySelector('.pf-form select')?.value,
    exps: document.querySelectorAll('.pf-exp').length,
    skills: [...document.querySelectorAll('.pf-chip')].map((c) => c.innerText.replace('×', '').trim()),
    email: document.querySelector('input[type="email"]')?.value
  }))
  console.log('5) 刷新后:', JSON.stringify(reloaded))
  await page.screenshot({ path: '.tmpmedia/profile-rich-after.png', fullPage: true })

  // 手机端
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await m.goto(URL, { waitUntil: 'domcontentloaded' })
  await m.fill('input[autocomplete="username"]', 'admin')
  await m.fill('input[autocomplete="current-password"]', '123456')
  await m.click('.login-btn')
  await m.waitForSelector('.wx-temp', { timeout: 20000 })
  await m.goto(URL + '#/profile', { waitUntil: 'domcontentloaded' })
  await m.waitForSelector('.pf-preview')
  await m.waitForTimeout(600)
  console.log('6) 手机端横向溢出:', await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
  await m.screenshot({ path: '.tmpmedia/profile-rich-mobile.png', fullPage: true })

  await browser.close()
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})