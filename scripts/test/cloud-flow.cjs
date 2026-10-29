const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

  await page.goto('http://localhost:5178/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  console.log('LOGIN_FORM', await page.isVisible('.login-form'));

  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(1200);

  console.log('HOME_URL', page.url());
  console.log('MODEL_TAG', (await page.textContent('.model-tag')).trim());
  console.log('STATUS', (await page.textContent('.chat-status')).trim());

  // 发送消息
  await page.fill('.chat-form textarea', '你好，请介绍一下阿里云百炼');
  await page.click('.send-btn');
  await page.waitForTimeout(2000);

  const bubbles = await page.locator('.msg-ai .bubble').allTextContents();
  console.log('AI_REPLY', bubbles[bubbles.length - 1]);
  console.log('MSG_COUNT', bubbles.length);

  // 快捷提问按钮
  const quick = await page.locator('.quick-btn').allTextContents();
  console.log('QUICK_BTNS', JSON.stringify(quick));
  await page.locator('.quick-btn').first().click();
  await page.waitForTimeout(2000);
  const b2 = await page.locator('.msg-ai .bubble').allTextContents();
  console.log('AFTER_QUICK', b2[b2.length - 1]);

  console.log('JS_ERRORS', JSON.stringify(errs));
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });