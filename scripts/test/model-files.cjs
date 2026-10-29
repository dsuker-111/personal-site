// 验证：本地模型旁「检查模型文件」→ 弹窗自检结果
const { chromium } = require('playwright')

const URL = process.env.APP_URL || 'http://localhost:5173/'

;(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    // 无头环境不会弹「访问本地网络」授权框，用这两个开关让授权生效（真实浏览器不需要）
    args: [
      '--enable-features=LocalNetworkAccessChecks',
      '--disable-features=BlockInsecurePrivateNetworkRequests'
    ]
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  // 从公网 HTTPS 页面访问 127.0.0.1 属于私有网络访问，需要授权；真实浏览器会弹窗让你点【允许】
  try {
    await context.grantPermissions(['local-network-access'], { origin: new URL(URL).origin })
  } catch {
    /* 本地 http 源不需要 */
  }
  const page = await context.newPage()

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })

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