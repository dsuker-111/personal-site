// 验证：点昵称下拉 → 个人信息 → 修改 → 保存后回到主页继续浏览
const { chromium } = require('playwright')

const URL = process.env.APP_URL || 'http://localhost:5173/'

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })
  console.log('1) 登录进入主页 ✔  问候语:', await page.$eval('.hero h2', (e) => e.textContent.trim()))

  // 下拉
  await page.click('.user-chip')
  await page.waitForSelector('.user-dropdown', { timeout: 5000 })
  const items = await page.$$eval('.um-item', (els) => els.map((e) => e.textContent.trim()))
  console.log('2) 下拉菜单项:', items.join(' | '))
  await page.screenshot({ path: '.tmpmedia/menu-open.png' })

  // 进个人信息
  await page.click('.um-item:has-text("个人信息")')
  await page.waitForSelector('.pf-card', { timeout: 10000 })
  console.log('3) 进入个人信息页 ✔  路由:', page.url().split('#')[1])

  // 改：头像、昵称、签名、默认城市
  await page.click('.pf-avatar-opt:nth-child(3)') // 🐱
  await page.fill('.pf-field input[type="text"] >> nth=0', '天气达人')
  await page.fill('.pf-field textarea', '专注写代码，顺便看天气。')
  await page.fill('.pf-field input[list="pf-city-list"]', '成都')
  await page.waitForTimeout(300)
  console.log('4) 草稿预览:', await page.$eval('.pf-preview', (e) => e.innerText.replace(/\s+/g, ' ').trim()))
  await page.screenshot({ path: '.tmpmedia/profile-edit.png' })

  // 保存
  await page.click('.pf-btn.primary')
  await page.waitForSelector('.pf-toast', { timeout: 5000 })
  console.log('5) 保存提示:', await page.$eval('.pf-toast', (e) => e.textContent.trim()))

  // 回到主页
  await page.waitForFunction(() => location.hash === '#/' || location.hash === '', { timeout: 8000 })
  await page.waitForSelector('.wx-temp', { timeout: 20000 })
  await page.waitForTimeout(2500)
  const after = await page.evaluate(() => ({
    hash: location.hash,
    hello: document.querySelector('.hero h2')?.textContent.trim(),
    avatar: document.querySelector('.user-chip .avatar')?.textContent.trim(),
    name: document.querySelector('.user-chip .user-name')?.textContent.trim(),
    city: document.querySelector('.wx-city span')?.textContent.trim()
  }))
  console.log('6) 返回主页后:', JSON.stringify(after))

  // 刷新验证持久化
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.wx-temp', { timeout: 25000 })
  await page.waitForTimeout(1500)
  const persist = await page.evaluate(() => ({
    hello: document.querySelector('.hero h2')?.textContent.trim(),
    name: document.querySelector('.user-chip .user-name')?.textContent.trim(),
    avatar: document.querySelector('.user-chip .avatar')?.textContent.trim(),
    city: document.querySelector('.wx-city span')?.textContent.trim()
  }))
  console.log('7) 刷新后仍生效:', JSON.stringify(persist))
  await page.screenshot({ path: '.tmpmedia/home-after-profile.png' })

  // 下拉里的签名也更新了
  await page.click('.user-chip')
  await page.waitForSelector('.user-dropdown')
  console.log('8) 下拉里的资料:', await page.$eval('.um-id', (e) => e.innerText.replace(/\s+/g, ' ').trim()))

  await browser.close()
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})