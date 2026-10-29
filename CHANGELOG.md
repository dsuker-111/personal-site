# 版本历史

本项目的版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`。

**大版本用 Git 分支 + 目录隔离**，互不影响：

| 大版本 | 分支 | Git tag | 线上目录 | 说明 |
| --- | --- | --- | --- | --- |
| v1.x | `release/v1` | `v1.0.0` | `/v1/` | 本地 Qwen + LoRA 模型版，代码冻结，仅修 bug |
| v2.x | `main` | `v2.0.0` `v2.1.0` `v2.2.0` `v2.3.0` `v2.4.0` `v2.5.0` | `/`（根） | 天气主页 + 浮动 AI 对话框，持续迭代 |

---

## v2.5.0 — 天气主界面 + 浮动 AI 对话框（2026-10-29）

**登录后进入的不是对话面板，而是天气主页；AI 助手收进右下角的浮动对话框。**

- 新增 `src/components/WeatherPanel.vue`：实时气温 / 体感 / 湿度 / 风速 + 5 天预报，
  支持城市搜索与常用城市快选，选过的城市记在 `localStorage`
- 新增 `src/api/weather.js`：**后端优先 + 直连降级** —— 先请求 `/api/weather`（服务端 10 分钟缓存），
  失败则浏览器直连 Open-Meteo（免 Key、支持 CORS），因此后端停服时天气照样能用
- 新增 `src/components/ChatWidget.vue`：右下角「💬 AI 助手」浮动按钮 → 展开 380×560 对话框，
  支持 Esc 收起、点 ✕ 关闭；**首次打开才挂载 AiChat**，不拖慢主页首屏
- 后端新增 `GET /api/weather?city=`，放行免登录（只读公共数据），并把预报从 4 天改为 5 天
- 修复：后端 `updatedAt` 是秒级时间戳，前端按毫秒解析会显示 1970 年，现统一转 ISO
- 修复：后端返回的气温是浮点数（24.1），前端统一四舍五入
- 登录容错：后端不可用（停服 / 欠费 / 断网）时降级到本地演示账号，不再整站进不去
- 新增 `server-fc/dev_server.py`：把 FC 的 handler 套上本地 HTTP，无需上云即可自测接口
- `vite.config.js` 忽略 `server-fc/` `server/` `scripts/` 等目录，避免编辑器临时文件把 watcher 搞崩
- 实测：天气接口（杭州/北京/成都）、登录、浮动对话框真实对话（中文链路）全部通过

## v2.4.0 — 多模型切换 + 本地 LoRA 接入（2026-10-29）

**对话面板可选择模型：4 个云端模型 + TRAE 训练的本地模型。**

- 新增 `src/api/models.js`：拉取云端模型清单、探测本机模型服务是否在线
- `AiChat.vue` 顶部新增模型下拉框，选项分组「云端 · 任何设备可用 / 本地 · 仅本机可用」，
  选择结果存入 `localStorage`，切换后立即重新检测连接状态
- 后端新增 `GET /api/models`；`POST /api/chat` 接受 `model` 参数并校验白名单，
  非法模型名直接拒绝（实测传 `gpt-4` 返回「不支持的模型」）
- 实测可用的云端模型：`deepseek-v4.1-flash`、`qwen-plus`、`qwen-max`、`qwen-long`
  （`qwen-turbo` 触发限流、`qwen2.5-*` 无权限、`deepseek-v3/r1` 与 `qwen3-*` 未上线，均未启用）
- 本地模型走 `server/web_api.py`（Qwen2.5-0.5B-Instruct + `lora_qa`），
  前端直连 `http://127.0.0.1:8000`，地址在 `public/config.js` 的 `__LOCAL_MODEL__` 配置
- **修复 PNA 拦截**：公网 HTTPS 页面访问本机地址时，预检响应必须带
  `Access-Control-Allow-Private-Network: true`，已加到 `web_api.py` 与 `mock_model.py`
- `mock_model.py` 补齐 CORS、OPTIONS 预检与 `/health` 字段，可离线验证前端链路
- 新增 `scripts/test/live-models.cjs`：真机验证模型切换

> 云端模型经后端调用，Key 不进前端；本地模型只在该台电脑上可用，
> 其他设备选择它会提示「本地模型服务未启动」。

## v2.3.0 — 后端版：资源库 + 服务端鉴权（2026-10-29）

**从纯静态升级为「前端 + 后端」，新增文件上传/下载/图片视频浏览，并接入阿里云函数计算。**

- 新增 `server-fc/`：阿里云函数计算 FC 3.0 HTTP 函数（Python 3.10，零第三方依赖）
  - `POST /api/login` 服务端校验密码，签发 HMAC 签名 token（有效期 7 天）
  - `GET /api/files` 资源列表 · `POST /api/upload` 上传 · `POST /api/delete` 删除
  - `GET /api/file?path=` 原样下载/预览 · `POST /api/chat` AI 对话代理 · `GET /api/health`
  - 文件存储复用 `personal-site` 仓库的 `media` 分支（不触发 Pages 构建）
- 新增 `server-fc/deploy.mjs`：一条命令完成打包、创建/更新函数、配置环境变量、绑定 HTTP 触发器
- **API Key 移出前端**：`public/config.js` 不再包含任何密钥，改由函数计算环境变量持有
- 新增 `src/api/http.js`（统一请求封装、token 管理）、`src/api/files.js`（资源库接口）
- 新增 `src/views/LibraryView.vue`：拖拽上传、图片/视频/文件分类浏览、灯箱预览、下载、删除
- 登录改为**真实后端校验**（`src/store/auth.js`），不再是前端写死密码比对
- 首页导航新增「资源库」入口
- 实测：线上登录、上传、列表、下载（字节一致）、删除、AI 真实对话全部通过

> 环境变量：`GITHUB_TOKEN` `AUTH_PASSWORD` `AUTH_SECRET` `DASHSCOPE_API_KEY`
> 后端地址：`https://personasite-api-ovjtmwtnlx.cn-hangzhou.fcapp.run`

## v2.2.0 — 双平台部署（2026-10-29）

**新增 Surge 部署通道，域名 `personal-site-ai.surge.sh`。**

- 新增 `npm run deploy:surge` 脚本，一条命令发布到 Surge
- 线上同时存在两个平台：Surge（`personal-site-ai.surge.sh`）+ GitHub Pages
- 两个平台都包含 `/v1/` 子目录，版本隔离保持一致
- README 补充 Surge 发布流程与凭据配置方式
- 实测：Surge 站点在 Edge 中登录、AI 真实对话、无 JS 报错

## v2.1.0 — 直连版（2026-10-29）

**任何电脑打开网址即可对话，无需本机运行任何服务。**

- 新增 `src/api/direct.js`：浏览器直连阿里云 DashScope OpenAI 兼容接口
- `src/api/model.js` 支持三模式自动选择：直连 / 公网代理 / 本机代理
- `public/config.js` 作为运行时配置入口，改一个文件即可切换模式，无需重新构建
- 关闭 `enable_thinking`，响应时间从十余秒降至约 1 秒，并避免推理 token 占满导致空回复
- 修复：直连模式下不再误报「未检测到代理服务」
- 新增 `server-vercel/`：Serverless 版代理（Vercel 域名在国内被 DNS 污染，仅备查）
- 新增 `scripts/test/direct-flow.cjs`、`live-direct.cjs` 真机验证脚本

## v2.0.0 — 云端代理版（2026-10-29）

**接入阿里云百炼 `deepseek-v4.1-flash`，经本机代理转发。**

- 新增 `server/cloud_api.py`：零依赖（Python 标准库）DashScope 代理
- API Key 仅存服务端环境变量，不进前端、不进仓库
- `src/api/model.js` 支持动态模型名、错误透传
- `AiChat.vue` 动态显示当前模型；修复快捷提问按钮 `send` 未暴露的问题
- 补充 PNA（私有网络访问）预检响应头
- 说明：线上公网页面访问 `127.0.0.1` 会被浏览器拦截，需授权或改用直连

## v1.0.0 — 本地模型版（2026-10-28）

**首个可用版本，按课程需求完成。**

- Vue 3 + Vite 5 + Vue Router 4（hash 路由，适配 GitHub Pages）
- 登录页（`admin / 123456`，前端本地模拟）→ 主页
- 个人主页：顶栏、欢迎区、技能/项目展示、页脚
- AI 对话面板：健康检查、多轮上下文、快捷提问、加载/错误态
- `server/web_api.py`：FastAPI 加载 `Qwen2.5-0.5B-Instruct` + `lora_qa` LoRA 权重
- GitHub Actions 自动部署到 GitHub Pages

---

## 如何查看/切换版本

```bash
# 查看所有版本
git tag -l -n1

# 查看某个版本改了什么
git show v2.0.0 --stat

# 切到旧版本（只读查看）
git checkout v1.0.0

# 回到最新
git checkout main

# 基于旧版本修 bug（v1 维护分支）
git checkout release/v1
```

线上同时可访问两个大版本：

- v2.1（最新）：https://dsuker-111.github.io/personal-site/
- v1.0（本地模型版）：https://dsuker-111.github.io/personal-site/v1/

> v1 的 AI 对话依赖本机运行 `server/web_api.py`（需 GPU/CPU 加载 Qwen 模型），
> 线上仅作界面与交互展示。

---

## 版本号规则

- **主版本（X.0.0）**：架构级变更，如更换模型接入方式、引入后端服务、破坏性重构
- **次版本（2.X.0）**：新增功能，如新增部署模式、新增页面模块
- **修订号（2.1.X）**：bug 修复、文案调整、样式微调

发布新版本时：

1. 更新 `package.json` 与 `VERSION` 文件
2. 在本文档顶部新增一节
3. 打 tag：`git tag -a v2.1.1 -m "说明"`
4. 推送：`git push origin main --tags`