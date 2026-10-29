"""
本地模型服务 web_api.py
=====================

在电脑上用 TRAE 训练好 Qwen2.5-0.5B-Instruct + LoRA(lora_qa) 之后，
运行本脚本即可启动一个 HTTP 服务，供前端 AI 对话框调用。

依赖（建议用 conda / venv 安装）：
    pip install torch transformers peft fastapi uvicorn accelerate

用法：
    python server/web_api.py

默认监听 http://127.0.0.1:8000，提供三个接口：
    GET  /health       健康检查
    GET  /model/files  自检：LoRA 目录 / 权重文件 / 依赖 / 加载状态（前端「检查模型文件」）
    POST /chat         对话

通过环境变量可覆盖默认值：
    MODEL_BASE   基础模型路径或名称，默认 "Qwen/Qwen2.5-0.5B-Instruct"
    LORA_DIR     LoRA 权重目录（TRAE 导出的 lora_qa），默认 "./output/lora_qa"
    PORT         监听端口，默认 8000
"""

import os
import threading
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

MODEL_BASE = os.environ.get("MODEL_BASE", "Qwen/Qwen2.5-0.5B-Instruct")
LORA_DIR = os.environ.get("LORA_DIR", "./output/lora_qa")
PORT = int(os.environ.get("PORT", "8000"))

# 模型 / 分词器在首次加载时才初始化，避免 import 时长时间阻塞
_tokenizer = None
_model = None
_load_lock = threading.Lock()


def ensure_model():
    """按需加载模型，仅执行一次。"""
    global _tokenizer, _model

    if _tokenizer is not None and _model is not None:
        return

    with _load_lock:
        if _tokenizer is not None and _model is not None:
            return

        from transformers import AutoModelForCausalLM, AutoTokenizer

        _tokenizer = AutoTokenizer.from_pretrained(MODEL_BASE, trust_remote_code=True)

        if os.path.isdir(LORA_DIR):
            from peft import PeftModel
            print(f"[web_api] 加载 LoRA 权重: {LORA_DIR}")
            base = AutoModelForCausalLM.from_pretrained(
                MODEL_BASE, trust_remote_code=True, device_map="auto"
            )
            _model = PeftModel.from_pretrained(base, LORA_DIR)
        else:
            print(f"[web_api] 未找到 LoRA 目录({LORA_DIR})，加载基础模型: {MODEL_BASE}")
            _model = AutoModelForCausalLM.from_pretrained(
                MODEL_BASE, trust_remote_code=True, device_map="auto"
            )

        _model.eval()


def build_prompt(user_text, history=None):
    """按 Qwen2.5-Instruct 的对话模板拼装输入。"""
    messages = []
    for item in history or []:
        role = item.get("role", "user")
        content = item.get("content", "")
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_text})
    return _tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)


app = FastAPI(title="本地 Qwen LoRA 模型服务")

# 允许前端跨域调用（生产环境可按需收紧）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 公网 HTTPS 页面访问 http://127.0.0.1 属于「私有网络访问(PNA)」，
# Chrome/Edge 要求预检响应带下面这个头，否则请求会被直接拦掉。
@app.middleware("http")
async def allow_private_network(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_BASE, "lora": os.path.isdir(LORA_DIR)}


def _scan_dir(path, limit=40):
    """列出目录里的文件（名称 / 大小 / 修改时间），用于「检查模型文件」。"""
    items = []
    try:
        names = sorted(os.listdir(path))
    except OSError:
        return items
    for name in names[:limit]:
        full = os.path.join(path, name)
        try:
            st = os.stat(full)
        except OSError:
            continue
        items.append({
            "name": name,
            "dir": os.path.isdir(full),
            "size": None if os.path.isdir(full) else st.st_size,
            "mtime": datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M"),
        })
    return items


def _pkg_version(name):
    try:
        import importlib.metadata as md

        return md.version(name)
    except Exception:
        return ""


@app.get("/model/files")
async def model_files():
    """自检：LoRA 目录、权重文件、依赖、加载状态。前端「检查模型文件」按钮调用。"""
    lora_abs = os.path.abspath(LORA_DIR)
    lora_exists = os.path.isdir(lora_abs)
    files = _scan_dir(lora_abs) if lora_exists else []
    names = {f["name"] for f in files}

    adapter_cfg = "adapter_config.json" in names
    weight = next((n for n in sorted(names) if n.startswith("adapter_model.")), "")
    adapter_weights = bool(weight)
    base_is_dir = os.path.isdir(MODEL_BASE)

    peft_ver = _pkg_version("peft")
    tf_ver = _pkg_version("transformers")
    loaded = _model is not None

    checks = [
        {"key": "service", "label": "本地服务在线", "ok": True,
         "detail": "http://127.0.0.1:%d" % PORT},
        {"key": "lora_dir", "label": "LoRA 目录存在", "ok": lora_exists, "detail": lora_abs},
        {"key": "adapter_config", "label": "adapter_config.json", "ok": adapter_cfg,
         "detail": "已找到" if adapter_cfg else "缺失：peft 读不到 LoRA 配置"},
        {"key": "adapter_weights", "label": "LoRA 权重文件", "ok": adapter_weights,
         "detail": weight or "缺失：需要 adapter_model.safetensors 或 adapter_model.bin"},
        {"key": "base_model", "label": "基础模型", "ok": True,
         "detail": MODEL_BASE + ("（本地目录）" if base_is_dir else "（HuggingFace 远程）")},
        {"key": "peft", "label": "peft 依赖", "ok": bool(peft_ver),
         "detail": peft_ver or "未安装：pip install peft"},
        {"key": "transformers", "label": "transformers 依赖", "ok": bool(tf_ver),
         "detail": tf_ver or "未安装：pip install transformers"},
        {"key": "loaded", "label": "模型已加载", "ok": loaded,
         "detail": "已加载到显存" if loaded else "尚未加载（第一次对话时才加载）"},
    ]

    ready = lora_exists and adapter_cfg and adapter_weights
    return {
        "ok": True,
        "service": "local-qwen-lora",
        "model": MODEL_BASE,
        "lora_dir": lora_abs,
        "lora_exists": lora_exists,
        "ready": ready,
        "loaded": loaded,
        "files": files,
        "total_size": sum(f["size"] or 0 for f in files),
        "checks": checks,
    }


@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    prompt = body.get("prompt", "")
    max_new_tokens = int(body.get("max_new_tokens", 320))
    temperature = float(body.get("temperature", 0.2))
    history = body.get("history", [])

    if not prompt.strip():
        return {"answer": ""}

    ensure_model()

    final_prompt = build_prompt(prompt, history)
    inputs = _tokenizer(final_prompt, return_tensors="pt")
    if hasattr(_model, "device"):
        inputs = {k: v.to(_model.device) for k, v in inputs.items()}

    gen_kwargs = dict(max_new_tokens=max_new_tokens, do_sample=True, temperature=temperature)
    outputs = _model.generate(**inputs, **gen_kwargs)

    new_tokens = outputs[0][inputs["input_ids"].size(1):]
    answer = _tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    return {"answer": answer}


if __name__ == "__main__":
    print("=" * 60)
    print("  本地 Qwen2.5-0.5B-Instruct + LoRA(lora_qa) 模型服务")
    print("  http://127.0.0.1:%d" % PORT)
    print("  基础模型 : %s" % MODEL_BASE)
    print("  LoRA路径 : %s (存在=%s)" % (LORA_DIR, os.path.isdir(LORA_DIR)))
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=PORT)