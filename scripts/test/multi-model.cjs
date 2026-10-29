// 验证：本地多模型（问答 / 孙悟空）——下拉列出、切换、对话、文件检查
const { chromium } = require('playwright')

const APP_URL = process.env.APP_URL || 'http://localhost:5173/'

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  try {
    await context.grantPermissions(['local-network-access'], { origin: new URL(APP_URL).origin })
  } catch (e) {
    console.log('授权失败:', e.message.slice(0, 60))
  }
  const page = await context.newPage()
  page.on('requestfailed', (r) => {
    if (r.url().includes('127.0.0.1')) console.log('   [请求失败]', r.url(), (r.failure() || {}).errorText)
  })

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', '123456')
  await page.click('.login-btn')
  await page.waitForSelector('.wx-temp', { timeout: 20000 })

  await page.click('.chat-fab')
  await page.waitForSelector('.chat-window', { timeout: 8000 })
  await page.waitForTimeout(1500)

  // 1) 下拉里的本地选项
  const locals = await page.evaluate(() =>
    [...document.querySelectorAll('#model-select optgroup[label^="本地"] option')].map((o) => ({
      value: o.value,
      text: o.textContent.trim()
    }))
  )
  console.log('1) 本地模型选项:')
  locals.forEach((o) => console.log('   ', o.value, '→', o.text))

  // 2) 切到孙悟空并提问
  const wukong = locals.find((o) => o.value.includes('wukong'))
  if (!wukong) throw new Error('下拉里没有孙悟空模型')
  await page.selectOption('#model-select', wukong.value)
  await page.waitForTimeout(800)
  const badge = await page.evaluate(() => document.querySelector('.model-badge')?.textContent.trim())
  console.log('2) 已切到:', wukong.text, '| 本机状态:', badge)

  await page.fill('.chat-form textarea', '报上名来，你是何方神圣？')
  await page.click('.send-btn')
  await page.waitForFunction(
    () => {
      const msgs = document.querySelectorAll('.msg-ai .bubble')
      const last = msgs[msgs.length - 1]
      return last && !last.querySelector('.typing') && last.textContent.trim().length > 0
    },
    { timeout: 180000 }
  )
  const answers = await page.evaluate(() =>
    [...document.querySelectorAll('.msg-ai .bubble')].map((b) => b.textContent.trim())
  )
  console.log('3) 孙悟空回答:', JSON.stringify(answers[answers.length - 1]))
  await page.screenshot({ path: '.tmpmedia/mm-wukong.png' })

  // 3) 文件检查（应指向 wukong 的目录）
  await page.click('.model-check-btn')
  await page.waitForSelector('.mf-summary, .mf-error', { timeout: 25000 })
  const chk = await page.evaluate(() => ({
    model: document.querySelector('.mf-model')?.textContent.trim() || '',
    summary: document.querySelector('.mf-summary')?.innerText.replace(/\s+/g, ' ').trim() || '',
    err: document.querySelector('.mf-error')?.innerText.replace(/\s+/g, ' ').trim() || ''
  }))
  console.log('4) 检查弹窗:', JSON.stringify(chk))
  await page.screenshot({ path: '.tmpmedia/mm-check.png' })
  await page.click('.mf-close')

  // 4) 切回问答模型再问一句，验证切回来也能用
  const qa = locals.find((o) => o.value.includes('qwen-lora-qa'))
  await page.selectOption('#model-select', qa.value)
  await page.waitForTimeout(500)
  await page.fill('.chat-form textarea', '你是谁？一句话。')
  await page.click('.send-btn')
  await page.waitForFunction(
    () => {
      const msgs = document.querySelectorAll('.msg-ai .bubble')
      const last = msgs[msgs.length - 1]
      return last && !last.querySelector('.typing') && last.textContent.trim().length > 0
    },
    { timeout: 180000 }
  )
  const last2 = await page.evaluate(() => {
    const msgs = document.querySelectorAll('.msg-ai .bubble')
    return msgs[msgs.length - 1].textContent.trim()
  })
  console.log('5) 切回问答模型回答:', JSON.stringify(last2))

  await browser.close()
})().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})