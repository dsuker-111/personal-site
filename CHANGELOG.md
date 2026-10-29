# 版本历史

本项目的版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`。

**大版本用 Git 分支 + 目录隔离**，互不影响：

| 大版本 | 分支 | Git tag | 线上目录 | 说明 |
| --- | --- | --- | --- | --- |
| v1.x | `release/v1` | `v1.0.0` | `/v1/` | 本地 Qwen + LoRA 模型版，代码冻结，仅修 bug |
| v2.x | `main` | `v2.0.0` `v2.1.0` | `/`（根） | 阿里云百炼 `deepseek-v4.1-flash`，持续迭代 |

---

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