const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // 登录
  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(700);

  // 检查页面关键元素
  const checks = {
    topbar: await page.isVisible('.topbar'),
    heroWelcome: (await page.textContent('.hero h2')).includes('欢迎回来'),
    chatPanel: await page.isVisible('.ai-chat'),
    chatStatus: await page.textContent('.chat-status'),
    quickBtns: await page.locator('.quick-btn').count(),
    logoutBtn: await page.isVisible('.logout-btn')
  };
  console.log('CHECKS', JSON.stringify(checks));

  // 测试 /api 代理（模型服务未启动，应返回失败但非报错页）
  const healthResp = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/health'); return 'status=' + r.status;
    } catch (e) { return 'fetch-error=' + e.message; }
  });
  console.log('HEALTH', healthResp);

  // 退出登录，验证回到登录页
  await page.click('.logout-btn');
  await page.waitForTimeout(500);
  console.log('AFTER_LOGOUT_URL', page.url());
  console.log('LOGIN_FORM_VISIBLE', await page.isVisible('.login-form'));

  console.log('JS_ERRORS', JSON.stringify(errors));
  await browser.close();
  console.log('ALL_DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });