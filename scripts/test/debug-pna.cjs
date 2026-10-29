const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

  page.on('console', (m) => console.log('[console:' + m.type() + ']', m.text()));
  page.on('requestfailed', (r) => console.log('[reqfail]', r.url(), '=>', r.failure() && r.failure().errorText));
  page.on('response', async (r) => {
    if (r.url().includes('8000')) console.log('[resp]', r.status(), r.url());
  });

  await page.goto('https://dsuker-111.github.io/personal-site/', { waitUntil: 'commit', timeout: 90000 });
  await page.waitForTimeout(3000);

  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(2500);

  // 直接在页面里 fetch，拿到真实结果
  const probe = await page.evaluate(async () => {
    try {
      const r = await fetch('http://127.0.0.1:8000/health');
      return 'ok ' + r.status + ' ' + (await r.text()).slice(0, 120);
    } catch (e) {
      return 'THROW ' + e.name + ': ' + e.message;
    }
  });
  console.log('DIRECT_FETCH:', probe);

  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });