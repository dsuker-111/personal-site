// 验证「前端直连阿里云」模式：真实调用 DashScope
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    if (r.url().includes('dashscope')) errs.push('reqfail: ' + r.url() + ' ' + (r.failure() || {}).errorText);
  });

  await page.goto('http://127.0.0.1:4176/#/login', { waitUntil: 'networkidle' });
  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(1500);

  console.log('STATUS', (await page.textContent('.chat-status')).trim());

  await page.fill('.chat-form textarea', '用一句话介绍你自己');
  await page.click('.send-btn');
  await page.waitForTimeout(12000);

  const bubbles = await page.locator('.msg-ai .bubble').allTextContents();
  console.log('AI_REPLY>>>', bubbles[bubbles.length - 1]);
  console.log('JS_ERRORS', JSON.stringify(errs));
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });