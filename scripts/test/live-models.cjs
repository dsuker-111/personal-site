// 验证模型选择器：云端模型切换 + 本地模型接入
const { chromium } = require('playwright')

const SITE = process.env.SITE_URL || 'https://personal-site-ai.surge.sh'

async function ask(page, text) {
  const before = await page.locator('.msg-ai .bubble').count()
  await page.fill('textarea', text)
  await page.press('textarea', 'Enter')
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000)
    const n = await page.locator('.msg-ai .bubble').count()
    if (n > before) {
      const all = await page.locator('.msg-ai .bubble').allTextContents()
      const last = (all[all.length - 1] || '').trim()
      if (last && !/正在|思考/.test(last)) return last
    }
  }
  return ''
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  // 允许「公网页面访问本机地址」，否则会被 PNA 策略拦截
  try {
    await ctx.grantPermissions(['local-network-access'])
  } catch (e) {
    console.log('   (授权 local-network-access 失败，将只测云端)', e.message.slice(0, 60))
  }
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)))

  console.log('1) 登录')
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1000)
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2500)

  console.log('2) 模型选择器')
  // 等模型清单加载完成（首次访问后端可能冷启动）
  for (let i = 0; i < 20; i++) {
    const v = await page.locator('#model-select').inputValue()
    if (v) break
    await page.waitForTimeout(1000)
  }
  const opts = await page.locator('#model-select option').allTextContents()
  console.log('   选项:', opts.map((s) => s.trim()).join(' / '))
  console.log('   当前:', await page.locator('#model-select').inputValue())
  console.log('   状态:', (await page.locator('.chat-status').textContent()).trim())

  console.log('3) 切换到 qwen-max 并提问')
  await page.selectOption('#model-select', 'qwen-max')
  await page.waitForTimeout(1200)
  const r1 = await ask(page, '只回答两个字：可以')
  console.log('   回复:', r1.slice(0, 60))

  console.log('4) 切换到本地 LoRA 模型')
  await page.selectOption('#model-select', 'local:qwen-lora')
  await page.waitForTimeout(2500)
  const badge = await page.locator('.model-badge').textContent().catch(() => '')
  console.log('   本地标记:', (badge || '').trim())
  console.log('   状态:', (await page.locator('.chat-status').textContent()).trim())

  let r2 = ''
  if ((badge || '').includes('在线')) {
    r2 = await ask(page, '本地模型你好')
    console.log('   回复:', r2.slice(0, 80))
  }

  console.log('5) 面板控制台错误:', errors.length ? errors.slice(0, 3).join(' | ') : '无')
  await page.screenshot({ path: require('node:path').join(__dirname, '..', '..', 'shots', 'live-models.png'), fullPage: true })
  await browser.close()

  const cloudOk = /可以|你好/.test(r1) || r1.length > 0
  const localOk = r2.includes('本地模拟模型')
  console.log('\n云端切换:', cloudOk ? '✅' : '❌', ' 本地模型:', localOk ? '✅' : '⚠️ 未连通')
  process.exit(cloudOk ? 0 : 1)
}

main().catch((e) => {
  console.error('异常:', e.message)
  process.exit(1)
})