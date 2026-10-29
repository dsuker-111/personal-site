// ===== 运行时配置（部署后可直接修改本文件，无需重新构建）=====
//
// 当前启用：【模式 1】直连阿里云百炼
//   - 优点：任何电脑打开网页都能对话，无需任何后端/本机服务
//   - ⚠️  安全提醒：API Key 会随网页一起下发，访问者可在浏览器里看到。
//       仅适合课程演示/个人使用。请务必：
//         1. 在阿里云百炼控制台给该 Key 设置调用额度上限
//         2. 演示结束后及时吊销或轮换该 Key
//
// 想换成更安全的【模式 2】公网代理：
//   把 __AI_DIRECT__ 置为 null，并填写 __AI_API_BASE__（如 https://你的代理域名/api）
//
// 【模式 3】本机代理：两者都留空，默认走 http://127.0.0.1:8000

window.__AI_DIRECT__ = {
  apiKey: 'sk-ws-H.YHXMYEH.zLSs.MEUCIFZhabJNuvDJqwb6IzX9B798FvA-jxchK0oty65X0WsMAiEA9G-lI4Zgu8121Q6VNiZA5LE1dxgym_1qZFO7OUxidLQ',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'deepseek-v4.1-flash'
}

// 公网代理地址（模式 2 时填写，例如 'https://your-proxy.example.com/api'）
window.__AI_API_BASE__ = ''