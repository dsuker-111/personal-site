// 运行时配置（部署后可直接改这个文件，无需重新打包）
//
// 当前模式：后端代理
//   浏览器 → 阿里云函数计算（FC）→ 阿里云百炼 DashScope
//   API Key 只存在函数计算的环境变量里，前端不接触。
//
// 如需改回「浏览器直连」（不需要后端，但 Key 会暴露在前端），
// 把 __API_BASE__ 置空，并填写下面的 __AI_DIRECT__。

window.__API_BASE__ = 'https://personasite-api-ovjtmwtnlx.cn-hangzhou.fcapp.run'

// 本地模型服务（TRAE 训练的 Qwen2.5-0.5B-Instruct + lora_qa）
// 只有运行了 server/web_api.py 的电脑才能连上，其他设备选择该模型会提示未启动。
window.__LOCAL_MODEL__ = 'http://127.0.0.1:8000'

// 浏览器直连模式（默认关闭）
window.__AI_DIRECT__ = null
// 旧版本遗留的代理前缀，保持为空
window.__AI_API_BASE__ = ''