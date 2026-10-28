const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });

  // 登录
  await page.fill('input[autocomplete=username]', 'admin');
  await page.fill('input[type=password]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(700);

  // 健康检查应已连接
  await page.waitForTimeout(1500);
  console.log('STATUS_TEXT', await page.textContent('.chat-status'));

  // 发送消息
  await page.fill('.chat-form textarea', '你好，请介绍你自己');
  await page.click('.send-btn');
  await page.waitForTimeout(1200);

  // 收集最后一条 AI 回复
  const bubbles = await page.locator('.msg-ai .bubble').allTextContents();
  console.log('LAST_AI_BUBBLE', bubbles[bubbles.length - 1]);
  console.log('MSG_COUNT', bubbles.length);

  await browser.close();
  console.log('CHAT_FLOW_DONE');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });