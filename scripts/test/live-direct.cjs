// 线上站点（公网 HTTPS）直连阿里云真机验证 —— 模拟"其他电脑"访问
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    if (r.url().includes('dashscope')) errs.push('reqfail: ' + (r.failure() || {}).errorText);
  });

  const URL = 'https://dsuker-111.github.io/personal-site/';
  await page.goto(URL, { waitUntil: 'commit', timeout: 90000 });
  await page.waitForTimeout(4000);

  console.log('PAGE_TITLE', await page.title());
  console.log('LOGIN_FORM', await page.isVisible('.login-form'));

  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(2000);

  console.log('MODEL_TAG', (await page.textContent('.model-tag')).trim());
  console.log('STATUS', (await page.textContent('.chat-status')).trim());

  await page.fill('.chat-form textarea', '你好，请用一句话介绍你自己');
  await page.click('.send-btn');
  await page.waitForTimeout(15000);

  const bubbles = await page.locator('.msg-ai .bubble').allTextContents();
  console.log('AI_REPLY>>>', bubbles[bubbles.length - 1]);
  console.log('JS_ERRORS', JSON.stringify(errs));

  await page.screenshot({ path: 'shots_live_direct.png', fullPage: false });
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });