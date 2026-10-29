# 个人网页 · AI 助手（Personal Site）

基于 **需求**（《QQ 软件开发工程实践》腾讯会议记录）开发的个人网页第一版：

- **登录界面**：进入首页前需要登录，登录成功后跳转到主页面。
- **Vue 3 前端**：登录后进入 Vue(3) + Vite 单页应用主界面。
- **AI 对话框**：内置 AI 对话面板，接入 **阿里云百炼 `deepseek-v4.1-flash`**（同时保留本地 TRAE 训练模型 Qwen2.5-0.5B-Instruct + LoRA 的接入能力）。

## 上线状态

- **线上地址**：https://dsuker-111.github.io/personal-site/（GitHub Pages）
- **GitHub 仓库**：https://github.com/dsuker-111/personal-site
- **部署方式**：`.github/workflows/deploy.yml` —— 推送 `main` 时自动构建并发布到 GitHub Pages，无需手动操作。
- **登录账号**：`admin / 123456`

> ⚠️ AI 对话框调用的是**你本机的代理服务**（http://127.0.0.1:8000）。线上页面是静态站，浏览器会直接请求本机 8000 端口（127.0.0.1 属浏览器信任的 loopback，HTTPS 页面也可调用）。
> 因此：**只有在你本机运行 `server/cloud_api.py` 时，线上页面才能收到模型答复**；未运行时会提示「未检测到 AI 代理服务」。

---

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 登录 | 账号 + 密码，本地模拟鉴权，localStorage 持久化登录态 |
| 主页面 | 顶栏（用户信息 / 退出）、欢迎区、AI 助手面板、快捷提问 |
| AI 对话 | 健康检查、多轮上下文、错误降级、动态显示当前模型名 |
| 云端模型 | 阿里云百炼 `deepseek-v4.1-flash`，经 `server/cloud_api.py` 代理（**API Key 只存服务端**） |
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
│   └── favicon.svg           图标
├── server/
│   ├── cloud_api.py          阿里云百炼代理（零依赖，推荐使用）
│   ├── web_api.py            本地模型服务（FastAPI，加载 Qwen + LoRA，可选）
│   ├── mock_model.py         假模型服务，用于纯前端联调
│   └── requirements.txt      web_api.py 所需 Python 依赖
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

### 2. 启动 AI 代理服务（接入阿里云 deepseek-v4.1-flash）

**零依赖**，只需要 Python 3（无需 pip install）。

先到[阿里云百炼控制台](https://bailian.console.aliyun.com/)创建 API Key，然后：

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

> 🔐 **API Key 只保存在本机服务端环境变量中**，不会打包进前端，也不会提交到仓库。

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
- AI 代理：Python 标准库（零依赖），对接阿里云百炼 OpenAI 兼容接口
- 可选本地模型：FastAPI · Transformers · PEFT

---

## 验证

已通过以下验证（系统 Edge 无头浏览器 + 生产构建产物实测）：

- 登录页正常渲染，`admin / 123456` 登录后跳转主页。
- 主页顶栏、欢迎区、AI 对话面板、4 个快捷提问按钮均正常。
- 阿里云代理链路：`/health` 显示 `已连接 · deepseek-v4.1-flash`；发送消息可收到回复（用 `mock_dashscope.py` 模拟上游验证完整转发，含 `Authorization` 与多轮上下文）。
- 快捷提问按钮可正常触发发送。
- 代理未启动时，对话框显示「未检测到 AI 代理服务」，前端无 JS 报错。
- 退出登录后回到 `/login`。

测试脚本见 `scripts/test/`（需 `playwright` + 系统 Edge）：

```bash
node scripts/test/verify.cjs       # 页面结构与路由验证
node scripts/test/prod-flow.cjs    # 生产产物：登录 → 对话 → 快捷提问
node scripts/test/live-check.cjs   # 线上 GitHub Pages 站点验证
```

## 待办 / 已知限制

- [ ] 登录为前端本地模拟，未接入后端数据库鉴权
- [ ] AI 对话为一次性请求返回，未实现流式输出（SSE）
- [ ] 线上站点依赖本机代理运行（`server/cloud_api.py`），如需纯在线可用，需把代理部署到云服务器
- [ ] 第一版仅含上述核心功能，后续可按需扩展留言板、作品集等模块

---

MIT License（见根目录 LICENSE 说明）。