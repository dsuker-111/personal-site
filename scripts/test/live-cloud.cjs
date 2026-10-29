const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

  const base = 'https://dsuker-111.github.io/personal-site/';
  await page.goto(base, { waitUntil: 'commit', timeout: 90000 });
  await page.waitForTimeout(3000);
  console.log('LOGIN_FORM', await page.isVisible('.login-form'));
  console.log('URL', page.url());

  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(2000);

  console.log('MODEL_TAG', (await page.textContent('.model-tag')).trim());
  console.log('STATUS', (await page.textContent('.chat-status')).trim());

  await page.fill('.chat-form textarea', '线上测试：介绍一下你自己');
  await page.click('.send-btn');
  await page.waitForTimeout(2500);
  const bubbles = await page.locator('.msg-ai .bubble').allTextContents();
  console.log('AI_REPLY', bubbles[bubbles.length - 1]);

  console.log('JS_ERRORS', JSON.stringify(errs));
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });