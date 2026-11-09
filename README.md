# 个人主页（Personal Site）

**当前版本：`v4.3.0`** · [版本历史](CHANGELOG.md)

基于 Vue 3 + Vite 构建的个人网站：访客打开即可浏览资料名片（多种卡片铺满页面），登录后进入主页并可编辑资料、管理资源库，支持 Supabase 邮箱登录与云端资料同步。

线上地址：**https://personal-site-ai.surge.sh**

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 公开名片 | 未登录即可浏览：主名片 + 基本资料 + 技能 + 职业经历 + 联系方式 + 网站收藏 + 我的设备，多卡片铺满页面 |
| 登录 | Supabase Auth 邮箱+密码；**云端不可达时自动降级为本地账号**（存浏览器 localStorage，断网也能登录）；登录入口为页面右上角小按钮，弹窗登录/注册 |
| 天气主页 | 实时气温、体感、湿度、风速 + 5天预报，支持城市搜索 |
| 个人档案 | 头像/昵称/签名/所在地/教育/职业/经历/技能/联系方式，保存到 Supabase `profiles` 表，跨设备同步 |
| 资源库 | 上传/预览/下载图片视频文件，走 Supabase Storage（免费1GB），跨设备可访问 |

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
浏览器（Vue 3 SPA，Surge / GitHub Pages 托管）
 ├─ 公开名片：未登录读取 profiles（公开 SELECT 策略）
 ├─ 登录/资料：Supabase Auth + profiles 表
 ├─ 天气：Open-Meteo（浏览器直连，免 Key）
 └─ 资源库：Supabase Storage（library 桶）
```

## 相关的独立项目

- **AI助手** [`ai-standalone`](https://github.com/dsuker-111/ai-standalone)：独立 AI 对话工具，专注聊天体验，部署在 https://ai-chat-tool.surge.sh
- 两个站共享同一个 Supabase 项目（Auth + DB + Storage）

## 技术栈

- 前端：Vue 3 · Vite 5 · Vue Router 4
- 认证：Supabase Auth
- 数据：Supabase PostgreSQL（profiles）
- 存储：Supabase Storage
- 天气：Open-Meteo API（免费，免 Key）
