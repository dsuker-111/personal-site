# 个人主页 · AI助手（Personal Site）

**当前版本：`v3.1.1`** · [版本历史](CHANGELOG.md)

基于 Vue 3 + Vite 构建的个人网站，支持本地账号登录、个人资料展示、AI 聊天、天气查询和资源库上传。

线上地址：**https://personal-site-ai.surge.sh**

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 登录 | 用户名+密码，账号存本地 localStorage，与 AI 助手站点独立 |
| 天气主页 | 实时气温、体感、湿度、风速 + 5天预报，支持城市搜索 |
| AI 对话 | 云端大模型 + 本地 LoRA 模型，右下角浮动窗口 |
| 个人档案 | 头像/昵称/签名/所在地/教育/职业/经历/技能/联系方式，保存后在主页展示资料卡 |
| 资源库 | 上传/预览/下载图片视频文件，走 Supabase Storage（免费1GB），跨设备可访问 |
| 界面主题 | 全站浅色：浅灰底 + 白色卡片 + 紫色按钮 |

## 支持模型

| 模型 | 来源 | 可用范围 |
| --- | --- | --- |
| `deepseek-v4.1-flash` | 阿里云百炼 | 任何设备 |
| `qwen-plus` | 阿里云百炼 | 任何设备 |
| `qwen-max` | 阿里云百炼 | 任何设备 |
| `qwen-long` | 阿里云百炼 | 任何设备 |
| 本地 LoRA 模型 | TRAE 训练 Qwen2.5-0.5B | 仅本机 |

云端模型走后端代理，API Key 不出服务端。本地模型由浏览器直连 `http://127.0.0.1:8000`。

## 快速开始

```bash
npm install
npm run dev       # 开发模式 http://localhost:5173
npm run build     # 生产构建到 dist/
```

> 默认账号：`admin / 123456`（本地演示用）

## 部署

```bash
npm run build
npx surge ./dist personal-site-ai.surge.sh  # 发布到 Surge
```

## 系统架构

```
浏览器（Vue 3 SPA，Surge 托管）
 ├─ AI 对话：阿里云百炼 DashScope
 ├─ 天气：Open-Meteo（浏览器直连，免 Key）
 ├─ 资源库：Supabase Storage（library 桶）
 └─ 本地模型：http://127.0.0.1:8000（可选）
```

## 技术栈

- 前端：Vue 3 · Vite 5 · Vue Router 4
- 样式：原生 CSS（响应式，适配 PC / 移动端）
- AI：阿里云百炼 deepseek-v4.1-flash（OpenAI 兼容接口）
- 存储：Supabase Storage
- 本地模型（可选）：FastAPI · Transformers · PEFT

## 已知限制

- 登录为前端本地模拟，未接入后端数据库鉴权
- AI 对话为一次性请求返回，未实现流式输出（SSE）
- 默认直连模式 API Key 暴露在前端，仅适合演示