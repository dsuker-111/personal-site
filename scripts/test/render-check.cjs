// 用系统 Edge 渲染登录页与主页，验证 UI 渲染。
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 登录页
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots_login.png' });
  console.log('LOGIN_PAGE_TITLE:', await page.title());

  // 填写并登录
  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots_home.png' });
  console.log('HOME_URL:', page.url());
  console.log('HOME_TEXT:', (await page.textContent('.hero')).replace(/\s+/g, ' ').trim());

  // 检查 AI 对话框是否存在
  const chatVisible = await page.isVisible('.ai-chat');
  console.log('AI_CHAT_VISIBLE:', chatVisible);

  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });