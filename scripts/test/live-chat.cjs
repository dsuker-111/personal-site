// 浏览器内验证 AI 对话走后端（token 鉴权 + 真实回复）
const { chromium } = require('playwright')

const SITE = process.env.SITE_URL || 'https://personal-site-ai.surge.sh'

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 140)))

  console.log('1) 登录', SITE)
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1000)
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2200)
  console.log('   地址:', page.url())

  console.log('2) 在对话框提问')
  await page.fill('textarea', '用一句话说明你现在运行在哪个后端上')
  await page.press('textarea', 'Enter')

  // 等待出现回复（轮询消息区）
  let reply = ''
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    const bubbles = await page.locator('.msg, .bubble, .message, .ai-msg, .chat-msg').allTextContents().catch(() => [])
    const all = bubbles.join(' ').trim()
    if (all.length > 20) {
      reply = all
      if (!/正在|思考中|…/.test(all.slice(-12))) break
    }
  }
  console.log('   回复片段:', reply.replace(/\s+/g, ' ').slice(-180) || '(未捕获)')

  const body = await page.textContent('body')
  const failed = /请求失败|网络异常|未登录|无法连接|服务不可用/.test(body)
  console.log('   出现失败提示:', failed)

  await page.screenshot({ path: require('node:path').join(__dirname, '..', '..', 'shots', 'live-chat.png'), fullPage: true })
  console.log('3) 控制台错误:', errors.length ? errors.slice(0, 3).join(' | ') : '无')

  await browser.close()
  const ok = reply.length > 10 && !failed
  console.log('\n结果:', ok ? '✅ AI 对话正常' : '❌ 对话异常')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error('异常:', e.message)
  process.exit(1)
})