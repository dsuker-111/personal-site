const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CONNECTION_REFUSED')) errs.push('console: ' + m.text()); });

  const base = 'https://dsuker-111.github.io/personal-site/';
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  console.log('TITLE', await page.title());
  console.log('LOGIN_FORM', await page.isVisible('.login-form'));
  console.log('URL_after_redirect', page.url());

  // 登录
  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(900);
  console.log('HOME_URL', page.url());
  console.log('HOME_WELCOME', (await page.textContent('.hero h2')).trim());
  console.log('CHAT_PANEL', await page.isVisible('.ai-chat'));
  console.log('CHAT_STATUS', await page.textContent('.chat-status').catch(()=>''));

  // hash 深链接直接登录页
  await page.goto(base + '#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  console.log('DEEPLINK_LOGIN', await page.isVisible('.login-form'));

  console.log('JS_ERRORS', JSON.stringify(errs));
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });