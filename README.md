# 个人网页 · AI 助手（Personal Site）

**当前版本：`v2.3.0`**（后端版：资源库 + 服务端鉴权）　·　[版本历史](CHANGELOG.md)　·　[GitHub 仓库](https://github.com/dsuker-111/personal-site)

基于 **需求**（《QQ 软件开发工程实践》腾讯会议记录）开发的个人网页：

- **登录界面**：进入首页前需要登录，**密码由后端校验**，校验通过后签发 token。
- **Vue 3 前端**：登录后进入 Vue(3) + Vite 单页应用主界面。
- **AI 对话框**：内置 AI 对话面板，接入 **阿里云百炼 `deepseek-v4.1-flash`**（API Key 只存在服务端）。
- **资源库**：上传/浏览/下载图片、视频和文件，换台电脑打开网址即可访问。

## 系统架构

```
浏览器 (Vue 3 SPA, Surge 托管)
   │
   ├── /api/login /api/files /api/upload /api/delete /api/file /api/chat
   ▼
阿里云函数计算 FC（Python 3.10，零第三方依赖）
   │
   ├── 文件读写 ──► GitHub 仓库 personal-site 的 media 分支
   └── AI 对话  ──► 阿里云百炼 DashScope (deepseek-v4.1-flash)
```

**后端地址**：`https://personasite-api-ovjtmwtnlx.cn-hangzhou.fcapp.run`
前端在 `public/config.js` 的 `window.__API_BASE__` 中配置该地址。

## 版本区分

大版本用 **Git 分支 + 线上目录** 双重隔离，互不影响。完整变更见 [CHANGELOG.md](CHANGELOG.md)。

| 大版本 | Git 分支 | Git tag | 线上地址 | AI 模型 | 状态 |
| --- | --- | --- | --- | --- | --- |
| **v2.x** | `main` | `v2.3.0` | [Surge](https://personal-site-ai.surge.sh/) · [Pages](https://dsuker-111.github.io/personal-site/) | 阿里云 `deepseek-v4.1-flash`（后端代理） | 🟢 维护中 |
| v1.x | `release/v1` | `v1.0.0` | [/v1/](https://personal-site-ai.surge.sh/v1/) | 本地 `Qwen2.5-0.5B-Instruct` + `lora_qa` | 🔒 冻结 |

```bash
git tag -l -n1              # 查看版本
git checkout v1.0.0         # 查看旧版本
git checkout release/v1     # 切到 v1 维护分支
git checkout main           # 回到最新
```

## 上线状态

双平台同时在线，内容一致：

| 平台 | 地址 | 说明 |
| --- | --- | --- |
| **Surge**（推荐） | **https://personal-site-ai.surge.sh** | 手动 `npm run deploy:surge` 发布，国内访问较快 |
| GitHub Pages | https://dsuker-111.github.io/personal-site/ | 推送 `main` 自动部署 |

- **GitHub 仓库**：https://github.com/dsuker-111/personal-site
- **登录账号**：`admin / 123456`

### 发布到 Surge

```bash
npm run build            # 生成 dist/
npm run deploy:surge     # 发布到 personal-site-ai.surge.sh
```

首次使用需登录 Surge（`npx surge login`，账号 `1792494646@qq.com`），或在 CI 中设置环境变量：

```bash
set SURGE_LOGIN=1792494646@qq.com
set SURGE_TOKEN=<你的 Surge token>   # 用 npx surge token 获取
```

> Surge 免费版提供 `*.surge.sh` 子域名；自定义域名需把 CNAME 指向 `na-west1.surge.sh` 并在 Surge 后台登记。

> ℹ️ **当前默认走后端代理**：浏览器 → 阿里云函数计算 → 阿里云百炼，**API Key 不进前端**，打开网页即可对话，无需本机启动任何服务。

### 部署后端（阿里云函数计算）

```bash
# 需要环境变量（都只在本地/CI 使用，不要提交到仓库）
set ALI_AK=<阿里云 AccessKey ID>
set ALI_SK=<阿里云 AccessKey Secret>
set GITHUB_TOKEN=<有 repo 写权限的 PAT>
set AUTH_PASSWORD=123456
set AUTH_SECRET=<随机字符串>
set DASHSCOPE_API_KEY=<阿里云百炼 Key>

npm run deploy:backend      # 打包 + 创建/更新函数 + 绑定 HTTP 触发器
node server-fc/test-api.mjs # 接口自测
```

部署成功后会打印公网地址，把它填进 `public/config.js` 的 `window.__API_BASE__`，再重新发布前端。

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/health` | GET | 健康检查（无需登录） |
| `/api/login` | POST | 校验密码，返回 token（7 天） |
| `/api/files` | GET | 资源列表 |
| `/api/upload` | POST | 上传（base64，单文件 ≤ 20MB） |
| `/api/delete` | POST | 删除 |
| `/api/file?path=` | GET | 原样下载 / 预览 |
| `/api/chat` | POST | AI 对话代理 |

> 文件实际存放在 GitHub 仓库 `personal-site` 的 `media` 分支，因此不需要对象存储。
> 全局要求：登录后才能调用（除 `/api/health`、`/api/login`），token 放在 `Authorization: Bearer <token>`。

---

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 登录 | 账号 + 密码，本地模拟鉴权，localStorage 持久化登录态 |
| 主页面 | 顶栏（用户信息 / 退出）、欢迎区、AI 助手面板、快捷提问 |
| AI 对话 | 健康检查、多轮上下文、错误降级、动态显示当前模型名 |
| 云端模型 | 阿里云百炼 `deepseek-v4.1-flash`。默认走**浏览器直连**（`public/config.js`），任何电脑打开网址即可对话 |
| 本地模型（可选） | TRAE 训练 `Qwen2.5-0.5B-Instruct` + LoRA `lora_qa`，经 `server/web_api.py` 提供服务 |

**默认账号**：`admin`　**默认密码**：`123456`

> ⚠️ 本地模拟鉴权仅用于演示，未做后端、未做加密。上线前请替换为真实的登录/Token 方案。

---

## 目录结构

```
personal-site/
├── index.html                入口 HTML
├── package.json              依赖与脚本
├── vite.config.js            Vite 配置（含 /api 代理到本地模型服务）
├── public/
│   ├── favicon.svg           图标
│   └── config.js             运行时配置（AI 模式与地址，部署后可改）
├── server/
│   ├── cloud_api.py          阿里云百炼代理（零依赖，本机/服务器均可跑）
│   ├── web_api.py            本地模型服务（FastAPI，加载 Qwen + LoRA，可选）
│   ├── mock_model.py         假模型服务，用于纯前端联调
│   └── requirements.txt      web_api.py 所需 Python 依赖
├── server-vercel/            Vercel Serverless 版代理（国内不可用，备查）
└── src/
    ├── main.js               Vue 应用入口 + 路由守卫
    ├── App.vue               根组件
    ├── assets/
    │   └── main.css          全局样式
    ├── router/index.js       路由（/ 主页，/login 登录）
    ├── store/auth.js         登录态管理
    ├── api/model.js          模型服务 API 封装
    ├── components/AiChat.vue AI 对话框组件
    └── views/
        ├── LoginView.vue     登录页
        └── HomeView.vue      主页面
```

---

## 快速开始

### 1. 安装前端依赖

```bash
npm install
```

### 2. 配置 AI 模型（三选一，默认已配好直连）

前端支持三种后端，在 `public/config.js` 里切换：

| 模式 | 配置方式 | 适用场景 | Key 是否安全 |
| --- | --- | --- | --- |
| ① 浏览器直连阿里云（**默认**） | 填 `window.__AI_DIRECT__.apiKey` | 任何电脑打开网址即可用 | ⚠️ 会暴露在前端 |
| ② 公网代理 | 填 `window.__AI_API_BASE__` | 部署到云服务器/函数计算 | ✅ 只在服务端 |
| ③ 本机代理 | 两者留空 | 仅本机开发使用 | ✅ 只在服务端 |

**模式 ①（当前启用）**：`public/config.js` 中已填入 Key，开箱即用。

> ⚠️ 直连模式的 Key 会随网页下发，访问者可在浏览器看到。**请务必在阿里云百炼控制台给该 Key 设置调用额度上限，演示结束后及时吊销/轮换。**

**模式 ③ 本机代理**（零依赖，只需 Python 3）：

```bat
:: Windows
set DASHSCOPE_API_KEY=sk-你的密钥
python server/cloud_api.py
```

```bash
# macOS / Linux
export DASHSCOPE_API_KEY=sk-你的密钥
python server/cloud_api.py
```

默认配置（可用环境变量覆盖）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DASHSCOPE_API_KEY` | 无（必填） | 阿里云百炼 API Key |
| `MODEL_NAME` | `deepseek-v4.1-flash` | 模型名 |
| `DASHSCOPE_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI 兼容接口 |
| `PORT` | `8000` | 监听端口 |

服务监听 `http://127.0.0.1:8000`：

- `GET /health` —— 健康检查，返回当前模型与是否已配置 Key
- `POST /chat` —— 对话，请求体 `{ "prompt": "...", "history": [], "max_tokens": 512, "temperature": 0.7 }`

> 🔐 模式 ②③ 下 **API Key 只保存在服务端环境变量中**，不会打包进前端。

### 3. 启动前端

```bash
npm run dev
```

浏览器打开 `http://localhost:5173`，使用默认账号 `admin / 123456` 登录。

> 开发模式下 `vite.config.js` 已将 `/api` 代理到 `http://127.0.0.1:8000`，前端无需处理跨域。

> **不想消耗额度也想看对话效果？** 运行 `python server/mock_model.py` 会在 8000 端口起一个假模型服务（返回「模拟回复」），可用于纯前端联调。

### 4. 生产构建

```bash
npm run build     # 输出到 dist/
npm run preview   # 本地预览构建产物
```

---

## 可选：改用本地 TRAE 训练模型

默认走阿里云 `deepseek-v4.1-flash`。若想改回本地模型，前端契约完全一致，只需换成 `web_api.py`：

1. 用 TRAE 按 `Qwen2.5-0.5B-Instruct` 微调，导出 LoRA 权重到 `lora_qa` 目录。
2. `pip install -r server/requirements.txt`
3. 设置 `MODEL_BASE` / `LORA_DIR` 后运行 `python server/web_api.py`（同样占用 8000 端口）。

`web_api.py` 已具备：按需加载模型、自动挂载 LoRA、Qwen 对话模板拼装、CORS 跨域。

---

## 技术栈

- 前端：Vue 3 · Vite 5 · Vue Router 4
- 样式：原生 CSS（响应式，适配 PC / 移动端）
- AI：阿里云百炼 `deepseek-v4.1-flash`（OpenAI 兼容接口）
- 后端（可选）：Python 标准库零依赖代理 / Vercel Serverless
- 可选本地模型：FastAPI · Transformers · PEFT

---

## 验证

已通过以下验证（系统 Edge 无头浏览器实测）：

- 登录页正常渲染，`admin / 123456` 登录后跳转主页。
- 主页顶栏、欢迎区、AI 对话面板、4 个快捷提问按钮均正常。
- **直连模式真实调用阿里云成功**：状态显示 `已连接 · deepseek-v4.1-flash`，回复为模型真实生成内容，0 JS 报错。
- 代理模式：`/health` 与 `/chat` 正常，正确透传 `Authorization` 与多轮上下文（用 `mock_dashscope.py` 模拟上游）。
- 快捷提问按钮可正常触发发送。
- 退出登录后回到 `/login`。

测试脚本见 `scripts/test/`（需 `playwright` + 系统 Edge）：

```bash
node scripts/test/verify.cjs       # 页面结构与路由验证
node scripts/test/direct-flow.cjs  # 直连模式：登录 → 真实调用阿里云
node scripts/test/prod-flow.cjs    # 代理模式：登录 → 对话 → 快捷提问
node scripts/test/live-check.cjs   # 线上 GitHub Pages 站点验证
```

## 待办 / 已知限制

- [ ] 登录为前端本地模拟，未接入后端数据库鉴权
- [ ] AI 对话为一次性请求返回，未实现流式输出（SSE）
- [ ] 直连模式下 API Key 暴露在前端，仅适合演示，正式上线请改为公网代理（模式 ②）
- [ ] Vercel / Cloudflare 域名在国内被 DNS 污染，不可用；如要公网代理，建议用阿里云函数计算或国内云主机
- [ ] 第一版仅含上述核心功能，后续可按需扩展留言板、作品集等模块

---

MIT License（见根目录 LICENSE 说明）。