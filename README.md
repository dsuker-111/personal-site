# 个人网页 · AI 助手（Personal Site）

# 个人网页 · AI 助手（Personal Site）

基于 **需求**（《QQ 软件开发工程实践》腾讯会议记录）开发的个人网页第一版：

- **登录界面**：进入首页前需要登录，登录成功后跳转到主页面。
- **Vue 3 前端**：登录后进入 Vue(3) + Vite 单页应用主界面。
- **AI 对话框**：内置 AI 对话面板，可与本机 **TRAE 训练**的本地模型 **Qwen2.5-0.5B-Instruct + LoRA(lora_qa)** 对话。

## 上线状态

- **线上地址**：https://dsuker-111.github.io/personal-site/（GitHub Pages）
- **GitHub 仓库**：https://github.com/dsuker-111/personal-site
- **部署方式**：`.github/workflows/deploy.yml` —— 推送 `main` 时自动构建并发布到 GitHub Pages，无需手动操作。
- **登录账号**：`admin / 123456`

> ⚠️ AI 对话面板调用的本地模型服务（http://127.0.0.1:8000）运行在你自己电脑上，因此**只有在你本机运行 `server/web_api.py` 时**，线上页面才能收到模型答复；未运行时页面会提示「未检测到本地模型服务」。

---

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 登录 | 账号 + 密码，本地模拟鉴权，localStorage 持久化登录态 |
| 主页面 | 顶栏（用户信息 / 退出）、欢迎区、AI 助手面板、快捷提问 |
| AI 对话 | 流式/请求式对话，健康检查，错误降级，内置模型状态提示 |
| 本地模型 | 由 TRAE 训练 `Qwen2.5-0.5B-Instruct` + LoRA `lora_qa`，通过 `server/web_api.py` 提供服务 |

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
│   └── web_api.py            本地模型服务（FastAPI，加载 Qwen + LoRA）
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

### 2. 启动本地模型服务（后端）

需要先在本机训练好模型：

- 基础模型：`Qwen/Qwen2.5-0.5B-Instruct`
- LoRA：由 TRAE 训练并导出的 `lora_qa` 权重目录

安装 Python 依赖（建议新建虚拟环境）：

```bash
pip install -r server/requirements.txt
```

启动服务：

```bash
# 方式一：直接使用默认路径（LoRA 在 ./output/lora_qa）
python server/web_api.py

# 方式二：通过环境变量指定模型与 LoRA 路径、端口
set MODEL_BASE=Qwen/Qwen2.5-0.5B-Instruct
set LORA_DIR=D:\trae\lora_qa
set PORT=8000
python server/web_api.py
```

服务默认监听 `http://127.0.0.1:8000`：

- `GET /health` —— 健康检查
- `POST /chat` —— 对话，请求体 `{ "prompt": "...", "history": [], "max_new_tokens": 320, "temperature": 0.2 }`

### 3. 启动前端

```bash
npm run dev
```

浏览器打开 `http://localhost:5173`，使用默认账号 `admin / 123456` 登录。

> 开发模式下 `vite.config.js` 已将 `/api` 代理到 `http://127.0.0.1:8000`，因此前端无需处理跨域。若模型服务未启动，AI 对话框会显示「未检测到本地模型服务」。

> **不想加载模型也想看对话效果？** 运行 `python server/mock_model.py` 会在 8000 端口起一个假模型服务（返回「模拟回复」），可用于纯前端联调。

### 4. 生产构建

```bash
npm run build     # 输出到 dist/
npm run preview   # 本地预览构建产物
```

---

## 如何对接「你自己训练的模型」

1. 用 TRAE 按 `Qwen2.5-0.5B-Instruct` 微调，训练后导出 LoRA 权重到 `lora_qa` 目录。
2. 修改 `server/web_api.py` 顶部常量，或设置 `MODEL_BASE` / `LORA_DIR` 环境变量。
3. 运行服务，前端即可对话。

目前 `web_api.py` 已具备：
- 首次请求时按需加载模型（`ensure_model`）
- 自动判断 LoRA 目录是否存在并加载 `PeftModel`
- 使用 Qwen 的 `apply_chat_template` 拼装多轮对话
- CORS 允许跨域调用

---

## 技术栈

- 前端：Vue 3 · Vite 5 · Vue Router 4
- 样式：原生 CSS（响应式，适配 PC / 移动端）
- 后端模型服务：Python · FastAPI · Transformers · PEFT

---

## 验证

第一版已通过以下验证（使用系统 Edge 无头浏览器）：

- 登录页正常渲染并完成 `admin / 123456` 登录，登录后跳转 `/`。
- 主页顶栏、欢迎区、AI 对话面板、4 个快捷提问按钮均正常显示。
- 模型服务在线时，发送消息可收到 AI 回复（用 `mock_model.py` 联调验证了完整往返）。
- 模型服务离线时，对话框显示「未检测到本地模型服务」提示，前端无 JS 报错。
- 退出登录后回到 `/login`。

测试脚本见 `scripts/test/`（需安装 `playwright` 并使用系统 Edge）：

```bash
node scripts/test/verify.cjs        # 页面结构与路由验证
node scripts/test/chat-flow.cjs     # 登录 → 发送 → 收到回复的完整流程（先起 mock 服务）
node scripts/test/render-check.cjs  # 渲染登录页 / 主页截图
```

## 待办 / 已知限制

- [ ] 登录目前为前端本地模拟，未接入后端数据库鉴权
- [ ] AI 对话为一次性请求返回，未实现流式输出（SSE）
- [ ] 前端构建后（dist）生产部署时，建议由反向代理统一转发 `/api`
- [ ] `server/web_api.py` 运行需要 GPU 或 CPU 均可，速度取决于本机算力
- [ ] 第一版仅含上述核心功能，后续可按需扩展留言板、作品集等模块

---

MIT License（见根目录 LICENSE 说明）。