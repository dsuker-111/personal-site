"""
本地模型服务 web_api.py
=====================

在电脑上用 TRAE 训练好 Qwen2.5-0.5B-Instruct + LoRA(lora_qa) 之后，
运行本脚本即可启动一个 HTTP 服务，供前端 AI 对话框调用。

依赖（建议用 conda / venv 安装）：
    pip install torch transformers peft fastapi uvicorn accelerate

用法：
    python server/web_api.py

默认监听 http://127.0.0.1:8000，提供两个接口：
    GET  /health  健康检查
    POST /chat    对话

通过环境变量可覆盖默认值：
    MODEL_BASE   基础模型路径或名称，默认 "Qwen/Qwen2.5-0.5B-Instruct"
    LORA_DIR     LoRA 权重目录（TRAE 导出的 lora_qa），默认 "./output/lora_qa"
    PORT         监听端口，默认 8000
"""

import os
import threading

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