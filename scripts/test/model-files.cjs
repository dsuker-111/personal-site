// 验证：本地模型旁「检查模型文件」→ 弹窗自检结果
const { chromium } = require('playwright')

const APP_URL = process.env.APP_URL || 'http://localhost:5173/'

;(async () => {
  // 注意：不要再加 --enable-features=LocalNetworkAccessChecks。
  // 新版 Edge/Chrome 默认就启用本地网络访问检查，手动开启反而会让
  // 无头模式下 fetch 被拦（表现为「无法连接本地服务」）。
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  // 从公网 HTTPS 页面访问 127.0.0.1 属于私有网络访问，需要授权；真实浏览器会弹窗让你点【允许】
  try {
    const origin = new URL(APP_URL).origin
    await context.grantPermissions(['local-network-access'], { origin })
    console.log('0) 已授权本地网络访问:', origin)
  } catch (e) {
    console.log('0) 授权失败（本地 http 源不需要）:', String(e.message).slice(0, 80))
  }
  const page = await context.newPage()

  page.on('requestfailed', (r) => {
    if (r.url().includes('127.0.0.1')) {
      console.log('   [请求失败]', r.url(), '→', (r.failure() || {}).errorText)
    }
  })
  page.on('response', (r) => {
    if (r.url().includes('127.0.0.1')) console.log('   [响应]', r.status(), r.url())
  })

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })

  // 探针：确认这个上下文能不能连本机服务（隔离「权限问题」和「应用问题」）
  const warm = await page.evaluate(async () => {
    try {
      const r = await fetch('http://127.0.0.1:8000/health', { cache: 'no-store' })
      return 'HTTP ' + r.status
    } catch (e) {
      return 'ERR ' + e.message
    }
  })
  console.log('0) 登录后探针:', warm)

  // 打开浮动对话框并切到本地模型
  await page.click('.chat-fab')
  await page.waitForSelector('.chat-window', { timeout: 8000 })
  await page.selectOption('#model-select', 'local:qwen-lora')
  await page.waitForSelector('.model-check-btn', { timeout: 8000 })
  console.log('1) 本地模型旁出现按钮:', (await page.$eval('.model-check-btn', (e) => e.textContent.trim())))

  await page.click('.model-check-btn')
  await page.waitForSelector('.mf-modal', { timeout: 10000 })
  // 等检查真正出结果（不是加载中）
  await page.waitForSelector('.mf-summary, .mf-error', { timeout: 20000 })
  await page.waitForTimeout(300)

  const report = await page.evaluate(() => ({
    error: document.querySelector('.mf-error')?.innerText.replace(/\s+/g, ' ').trim() || '',
    summary: document.querySelector('.mf-summary')?.innerText.replace(/\s+/g, ' ').trim(),
    checks: [...document.querySelectorAll('.mf-checks li')].map((li) => ({
      ok: li.classList.contains('on'),
      text: li.innerText.replace(/\s+/g, ' ').trim()
    })),
    files: [...document.querySelectorAll('.mf-files tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()),
    filesTitle: document.querySelector('.mf-files-title')?.innerText.trim()
  }))
  console.log('2) 结论:', report.summary || ('检查失败 → ' + report.error))
  console.log('3) 检查项:')
  report.checks.forEach((c) => console.log('   ' + (c.ok ? '✓' : '✕') + ' ' + c.text))
  console.log('4) 文件列表:', report.filesTitle)
  report.files.forEach((f) => console.log('   ' + f))

  await page.screenshot({ path: '.tmpmedia/model-files.png' })

  // Esc 只关弹窗，不该把对话框一起关掉
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  const afterEsc = await page.evaluate(() => ({
    modal: !!document.querySelector('.mf-modal'),
    chat: !!document.querySelector('.chat-window')
  }))
  console.log('5) Esc 之后 —— 弹窗:', afterEsc.modal, '| 对话框仍在:', afterEsc.chat)

  await browser.close()
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})