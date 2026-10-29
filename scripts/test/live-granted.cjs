// 验证：线上 HTTPS 站点在获得「本地网络访问」授权后，可完整对话
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.grantPermissions(['local-network-access'], { origin: 'https://dsuker-111.github.io' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

  const base = 'https://dsuker-111.github.io/personal-site/';
  await page.goto(base, { waitUntil: 'commit', timeout: 90000 });
  await page.waitForTimeout(3000);
  console.log('LOGIN_FORM', await page.isVisible('.login-form'));

  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(2500);

  console.log('MODEL_TAG', (await page.textContent('.model-tag')).trim());
  console.log('STATUS', (await page.textContent('.chat-status')).trim());

  await page.fill('.chat-form textarea', '线上验证：请介绍一下你自己');
  await page.click('.send-btn');
  await page.waitForTimeout(3000);
  const bubbles = await page.locator('.msg-ai .bubble').allTextContents();
  console.log('AI_REPLY', bubbles[bubbles.length - 1]);
  console.log('JS_ERRORS', JSON.stringify(errs));
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });