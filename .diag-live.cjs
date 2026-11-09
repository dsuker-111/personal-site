const { chromium } = require('playwright')

const urls = [
  'https://personal-site-ai.surge.sh/',
  'https://dsuker-111.github.io/personal-site/'
]

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  for (const url of urls) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    const failed = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
    page.on('requestfailed', (r) => failed.push(r.url() + ' :: ' + (r.failure() && r.failure().errorText)))
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    } catch (e) {
      console.log(url, 'GOTO_FAILED:', e.message)
    }
    await page.waitForTimeout(2000)
    const info = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      bodyText: (document.body.innerText || '').slice(0, 200),
      appHtmlLen: (document.getElementById('app') || {}).innerHTML ? document.getElementById('app').innerHTML.length : 0,
      cards: document.querySelectorAll('.scard').length,
      btn: (document.querySelector('.auth-trigger') || {}).textContent || null
    }))
    console.log('=== ' + url)
    console.log(JSON.stringify(info, null, 2))
    console.log('ERRORS:', JSON.stringify(errors, null, 2))
    console.log('FAILED:', JSON.stringify(failed, null, 2))
    await page.close()
  }
  await browser.close()
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
