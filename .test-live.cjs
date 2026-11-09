const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('https://personal-site-ai.surge.sh/#/login', { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(1500)
  const cards = await page.evaluate(() => document.querySelectorAll('.scard').length)

  await page.click('.auth-trigger')
  await page.waitForTimeout(400)
  await page.click('.login-tabs button:nth-child(2)')
  await page.fill('input[type=email]', 'demo@local.com')
  await page.fill('input[type=password]', 'abc123')
  await page.click('.login-btn')
  await page.waitForURL(/#\/$/, { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(1500)

  const info = await page.evaluate(() => ({
    url: location.href,
    pcard: Boolean(document.querySelector('.pcard')),
    nick: (document.querySelector('.pcard-name h2') || {}).textContent || null,
    hero: (document.querySelector('.hero h2') || {}).textContent || null,
    mode: (JSON.parse(localStorage.getItem('ps_auth_user') || '{}')).mode
  }))
  console.log('LOGIN_PAGE_CARDS:', cards)
  console.log(JSON.stringify(info, null, 2))
  console.log('ERRORS:', JSON.stringify(errors))
  await browser.close()
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
