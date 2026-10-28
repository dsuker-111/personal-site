const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  // 模拟 GitHub Pages 子路径：/myrepo/ 下加载
  await page.goto('http://127.0.0.1:4176/myrepo/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  console.log('TITLE', await page.title());
  console.log('LOGIN_FORM', await page.isVisible('.login-form'));
  console.log('HASH_URL', page.url());

  // hash 深链接：直接访问 #/login 应能渲染登录页
  await page.goto('http://127.0.0.1:4176/myrepo/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  console.log('HASH_LOGIN_VISIBLE', await page.isVisible('.login-form'));

  // 登录跳转主页
  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(700);
  console.log('HOME_HASH_URL', page.url());
  console.log('HOME_WELCOME', (await page.textContent('.hero h2')).trim());
  console.log('CHAT_VISIBLE', await page.isVisible('.ai-chat'));
  console.log('CHAT_STATUS', await page.textContent('.chat-status'));

  console.log('JS_ERRORS', JSON.stringify(errs));
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });