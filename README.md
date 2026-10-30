# 个人主页 · AI助手（Personal Site）

**当前版本：`v4.0.0`** · [版本历史](CHANGELOG.md)

基于 Vue 3 + Vite 构建的个人网站，支持 Supabase 邮箱登录、云端资料同步、AI 聊天、天气查询和资源库上传。

线上地址：**https://personal-site-ai.surge.sh**

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 登录 | Supabase Auth 邮箱+密码，账号存云端，换电脑也可登录 |
| 天气主页 | 实时气温、体感、湿度、风速 + 5天预报，支持城市搜索 |
| AI 对话 | 云端大模型 + 本地 LoRA 模型，右下角浮动窗口 |
| 个人档案 | 头像/昵称/签名/所在地/教育/职业/经历/技能/联系方式，保存到 Supabase `profiles` 表，跨设备同步 |
| 资源库 | 上传/预览/下载图片视频文件，走 Supabase Storage（免费1GB），跨设备可访问 |
| 对话同步 | 对话写入 Supabase `chat_history` 表，换电脑登录后自动恢复 |

## 支持模型

| 模型 | 来源 | 可用范围 |
| --- | --- | --- |
| `deepseek-v4.1-flash` | 阿里云百炼 | 任何设备 |
| `qwen-plus` | 阿里云百炼 | 任何设备 |
| `qwen-max` | 阿里云百炼 | 任何设备 |
| `qwen-long` | 阿里云百炼 | 任何设备 |
| 本地 LoRA 模型 | TRAE 训练 Qwen2.5-0.5B | 仅本机 |

## 快速开始

```bash
npm install
npm run dev       # 开发模式 http://localhost:5173
npm run build     # 生产构建到 dist/
```

## 部署

```bash
npm run build
npx surge ./dist personal-site-ai.surge.sh
```

## 系统架构

```
浏览器（Vue 3 SPA，Surge 托管）
 ├─ 登录/资料：Supabase Auth + profiles 表
 ├─ AI 对话：阿里云百炼 DashScope
 ├─ 对话记录：Supabase chat_history 表
 ├─ 天气：Open-Meteo（浏览器直连，免 Key）
 ├─ 资源库：Supabase Storage（library 桶）
 └─ 本地模型：http://127.0.0.1:8000（可选）
```

## 相关的独立项目

- **AI助手** [`ai-standalone`](https://github.com/dsuker-111/ai-standalone)：独立 AI 对话工具，专注聊天体验，部署在 https://ai-chat-tool.surge.sh
- 两个站共享同一个 Supabase 项目（Auth + DB + Storage）

## 技术栈

- 前端：Vue 3 · Vite 5 · Vue Router 4
- 认证：Supabase Auth
- 数据：Supabase PostgreSQL（profiles、chat_history）
- 存储：Supabase Storage
- 天气：Open-Meteo API（免费，免 Key）
- 本地模型（可选）：FastAPI · Transformers · PEFT