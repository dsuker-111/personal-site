// 验证：头像图片上传 + 网站收藏 + 设备展示
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const URL = process.env.APP_URL || 'http://localhost:5173/'
const SHOT = '.tmpmedia'

// 造一张 420x420 的渐变 PNG 当"照片"
function makePhoto() {
  const w = 420, h = 420
  const { execFileSync } = require('child_process')
  const px = Buffer.alloc(w * h * 3)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      px[i] = Math.round(80 + (x / w) * 130)
      px[i + 1] = Math.round(60 + (y / h) * 120)
      px[i + 2] = 220
    }
  }
  // 用 sharp 没有就手写 PNG（zlib）
  const zlib = require('zlib')
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const t = Buffer.from(type, 'ascii')
    const crcBuf = Buffer.concat([t, data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf) >>> 0)
    return Buffer.concat([len, t, data, crc])
  }
  let table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  function crc32(buf) {
    let c = 0xffffffff
    for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
  const p = path.resolve(SHOT, 'avatar-src.png')
  fs.writeFileSync(p, png)
  return p
}

;(async () => {
  const photo = makePhoto()
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })

  await page.goto(URL + '#/profile', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pf-preview')

  // 1) 上传照片做头像
  await page.setInputFiles('.pf-avatar-up input[type=file]', photo)
  await page.waitForFunction(() => {
    const img = document.querySelector('.pf-avatar img')
    return img && img.src.startsWith('data:image/jpeg') && img.naturalWidth > 0
  }, { timeout: 15000 })
  const avatar = await page.evaluate(() => {
    const img = document.querySelector('.pf-avatar img')
    return { isJpeg: img.src.startsWith('data:image/jpeg'), kb: Math.round(img.src.length / 1024), w: img.naturalWidth }
  })
  console.log(`1) 头像上传: jpeg=${avatar.isJpeg} 约${avatar.kb}KB 宽${avatar.w}px`)

  // 2) 填基本信息
  await page.fill('.pf-field input[placeholder="如 杭州"]', '杭州')

  // 3) 加两条收藏
  const addSite = page.locator('.pf-add', { hasText: '添加一条' })
  for (let i = 0; i < 2; i++) await addSite.click()
  const sites = [
    { name: 'GitHub', url: 'https://github.com/dsuker-111', desc: '我写代码的地方' },
    { name: 'Vue 3 文档', url: 'vuejs.org', desc: '天天要翻' }
  ]
  const siteBlocks = page.locator('div.pf-exp', { has: page.locator('.pf-exp-head span', { hasText: /^站点 / }) })
  for (let i = 0; i < sites.length; i++) {
    const b = siteBlocks.nth(i)
    await b.locator('input').nth(0).fill(sites[i].name)
    await b.locator('input').nth(1).fill(sites[i].url)
    await b.locator('input').nth(2).fill(sites[i].desc)
  }

  // 4) 加两台设备
  const addDev = page.locator('.pf-add', { hasText: '添加一件' })
  for (let i = 0; i < 2; i++) await addDev.click()
  const devs = [
    { name: '主力笔记本', spec: 'R7-7840H · 32G · 1T SSD', note: '日常开发' },
    { name: '机械键盘', spec: '87 键 · 茶轴', note: '写代码手感好' }
  ]
  const devBlocks = page.locator('div.pf-exp', { has: page.locator('.pf-exp-head span', { hasText: /^设备 / }) })
  for (let i = 0; i < devs.length; i++) {
    const b = devBlocks.nth(i)
    await b.locator('input').nth(0).fill(devs[i].name)
    await b.locator('input').nth(1).fill(devs[i].spec)
    await b.locator('input').nth(2).fill(devs[i].note)
  }

  await page.waitForTimeout(400)
  const preview = await page.evaluate(() => ({
    sites: [...document.querySelectorAll('.pf-sites li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()),
    devices: [...document.querySelectorAll('.pf-devices li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim())
  }))
  console.log('2) 名片侧栏 收藏:', JSON.stringify(preview.sites))
  console.log('   名片侧栏 设备:', JSON.stringify(preview.devices))

  await page.screenshot({ path: path.join(SHOT, 'profile-v3-top.png') })
  await page.evaluate(() => document.querySelector('.pf-section:nth-of-type(1)')?.scrollIntoView())
  await page.evaluate(() => window.scrollTo(0, 1150))
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(SHOT, 'profile-v3-sites.png') })

  // 5) 保存
  await page.click('.pf-btn.primary')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })
  await page.waitForTimeout(1200)
  const chip = await page.evaluate(() => {
    const img = document.querySelector('.user-chip .avatar img')
    return { hasImg: !!img, w: img ? img.naturalWidth : 0 }
  })
  console.log('3) 顶栏头像已用照片:', chip.hasImg, `(${chip.w}px)`)
  await page.screenshot({ path: path.join(SHOT, 'profile-v3-home.png') })

  // 6) 刷新后仍在
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.wx-temp', { timeout: 20000 })
  await page.goto(URL + '#/profile', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pf-preview')
  await page.waitForTimeout(600)
  const after = await page.evaluate(() => ({
    avatar: !!document.querySelector('.pf-avatar img'),
    sites: document.querySelectorAll('.pf-sites li').length,
    devices: document.querySelectorAll('.pf-devices li').length,
    stored: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ps_profile') || '{}')
        return { avatar: !!p.avatarUrl, sites: (p.sites || []).length, devices: (p.devices || []).length }
      } catch { return null }
    })()
  }))
  console.log('4) 刷新后 头像:', after.avatar, '| 收藏:', after.sites, '| 设备:', after.devices, '| 本地存储:', JSON.stringify(after.stored))

  // 7) 手机端
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await m.goto(URL, { waitUntil: 'domcontentloaded' })
  await m.fill('input[autocomplete="username"]', 'admin')
  await m.fill('input[autocomplete="current-password"]', '123456')
  await m.click('.login-btn')
  await m.waitForSelector('.wx-temp', { timeout: 20000 })
  await m.goto(URL + '#/profile', { waitUntil: 'domcontentloaded' })
  await m.waitForSelector('.pf-preview')
  await m.waitForTimeout(500)
  console.log('5) 手机端横向溢出:', await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
  await m.screenshot({ path: path.join(SHOT, 'profile-v3-mobile.png') })

  await browser.close()
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})