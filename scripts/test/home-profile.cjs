// 验证主页个人资料展示：登录 → 注入完整资料 → 刷新主页 → 截图 + 断言各区块
const { chromium } = require('playwright')

const APP_URL = process.env.APP_URL || 'http://localhost:5173/'

const RICH_PROFILE = {
  username: 'admin',
  nickname: '李大侠',
  avatar: '🐱',
  avatarUrl: '',
  title: '前端开发工程师',
  company: '腾讯',
  location: '杭州',
  bio: '记录天气，也记录想法。',
  school: '浙江大学',
  major: '软件工程',
  degree: '本科',
  eduPeriod: '2021 - 2025',
  experiences: [
    { company: '腾讯', role: '前端开发实习', period: '2024.06 - 2024.09', desc: '主要负责 Web 端性能优化。' }
  ],
  skills: ['Vue 3', 'JavaScript', 'CSS', 'Python', 'AI 应用'],
  sites: [
    { icon: '🐙', name: 'GitHub', url: 'https://github.com', desc: '我写代码的地方' },
    { icon: '📚', name: '掘金', url: 'https://juejin.cn', desc: '技术博客' }
  ],
  devices: [
    { icon: '💻', name: '主力笔记本', spec: 'R7-7840H · 32G · 1T SSD', note: '日常开发主力' },
    { icon: '📱', name: '手机', spec: 'Android', note: '' }
  ],
  email: 'lixia@example.com',
  github: 'github.com/lixia',
  website: '',
  city: '杭州',
  citySet: true
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 960, height: 2200 } })
  const page = await context.newPage()
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })

  // 登录（开发模式本地演示账号）
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })

  // 注入资料
  await page.evaluate((p) => {
    localStorage.setItem('ps_profile', JSON.stringify(p))
  }, RICH_PROFILE)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pcard', { timeout: 15000 })

  const result = {
    nickname: await page.evaluate(() => document.querySelector('.pcard-name h2')?.textContent.trim()),
    job: await page.evaluate(() => document.querySelector('.pcard-job')?.textContent.trim()),
    bio: await page.evaluate(() => document.querySelector('.pcard-bio')?.textContent.trim()),
    edu: await page.evaluate(() => document.querySelector('.pcard-meta li:first-child')?.textContent.replace(/\s+/g, ' ').trim()),
    locale: await page.evaluate(() => document.querySelector('.pcard-meta li:nth-child(2)')?.textContent.trim()),
    skills: await page.evaluate(() => [...document.querySelectorAll('.pcard-skill')].map((e) => e.textContent.trim())),
    expTitle: await page.evaluate(() => document.querySelector('.pcard-block .pcard-title')?.textContent.replace(/\s+/g, ' ').trim()),
    expRole: await page.evaluate(() => document.querySelector('.pcard-exp strong')?.textContent.trim()),
    contacts: await page.evaluate(() => [...document.querySelectorAll('.pcard-links a')].map((a) => a.textContent.trim())),
    sites: await page.evaluate(() => [...document.querySelectorAll('.pcard-col:first-child .pcard-list strong')].map((e) => e.textContent.trim())),
    devices: await page.evaluate(() => [...document.querySelectorAll('.pcard-col:nth-child(2) .pcard-list strong')].map((e) => e.textContent.trim()))
  }
  console.log('个人资料卡内容:')
  console.log(JSON.stringify(result, null, 2))

  await page.screenshot({ path: '.tmpmedia/pp-home-profile.png', fullPage: true })

  // 断言
  const checks = {
    昵称: result.nickname === '李大侠',
    职位公司: /前端开发工程师/.test(result.job || '') && /腾讯/.test(result.job || ''),
    个性签名: (result.bio || '').length > 0,
    教育学历: /浙江大学.*软件工程.*本科/.test(result.edu || ''),
    所在地: (result.locale || '').includes('杭州'),
    '技能5个': result.skills.length === 5,
    职业经历: result.expRole === '前端开发实习',
    联系方式: result.contacts.length === 2,
    收藏: result.sites.join(',') === 'GitHub,掘金',
    设备: result.devices.join(',') === '主力笔记本,手机'
  }
  console.log('\n断言:')
  let fail = 0
  for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? '✅' : '❌'} ${k}`)
    if (!v) fail++
  }
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})