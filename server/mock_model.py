# 模拟模型服务，用于端到端测试前端「本地模型」流程。
# 仅用于验证前端链路，实际运行请用 server/web_api.py（加载 Qwen + LoRA）。
#
# 与 web_api.py 保持同样的接口和 CORS 行为：
#   GET  /health -> {"status":"ok","model":...,"lora":true}
#   POST /chat   -> {"answer": "..."}
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime
import json
import os

PORT = int(os.environ.get("PORT", "8000"))
MODEL_BASE = os.environ.get("MODEL_BASE", "Qwen/Qwen2.5-0.5B-Instruct (mock)")
LORA_DIR = os.environ.get("LORA_DIR", "./output/lora_qa")


def _scan_dir(path, limit=40):
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


def model_files_payload():
    lora_abs = os.path.abspath(LORA_DIR)
    lora_exists = os.path.isdir(lora_abs)
    files = _scan_dir(lora_abs) if lora_exists else []
    names = {f["name"] for f in files}
    adapter_cfg = "adapter_config.json" in names
    weight = next((n for n in sorted(names) if n.startswith("adapter_model.")), "")

    checks = [
        {"key": "service", "label": "本地服务在线", "ok": True,
         "detail": "http://127.0.0.1:%d（模拟）" % PORT},
        {"key": "lora_dir", "label": "LoRA 目录存在", "ok": lora_exists, "detail": lora_abs},
        {"key": "adapter_config", "label": "adapter_config.json", "ok": adapter_cfg,
         "detail": "已找到" if adapter_cfg else "缺失：peft 读不到 LoRA 配置"},
        {"key": "adapter_weights", "label": "LoRA 权重文件", "ok": bool(weight),
         "detail": weight or "缺失：需要 adapter_model.safetensors 或 adapter_model.bin"},
        {"key": "base_model", "label": "基础模型", "ok": True,
         "detail": MODEL_BASE + "（模拟）"},
        {"key": "peft", "label": "peft 依赖", "ok": True, "detail": "0.13.2（模拟）"},
        {"key": "transformers", "label": "transformers 依赖", "ok": True, "detail": "4.45.1（模拟）"},
        {"key": "loaded", "label": "模型已加载", "ok": False,
         "detail": "尚未加载（第一次对话时才加载）"},
    ]

    return {
        "ok": True,
        "service": "local-qwen-lora",
        "model": MODEL_BASE,
        "lora_dir": lora_abs,
        "lora_exists": lora_exists,
        "ready": lora_exists and adapter_cfg and bool(weight),
        "loaded": False,
        "files": files,
        "total_size": sum(f["size"] or 0 for f in files),
        "checks": checks,
        "mock": True,
    }


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        # 公网 HTTPS 页面访问本机地址时，Chrome/Edge 的私有网络访问(PNA)要求该响应头
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        route = self.path.split("?")[0]
        if route == "/health":
            self._json({
                "status": "ok",
                "model": MODEL_BASE,
                "lora": os.path.isdir(LORA_DIR),
            })
        elif route == "/model/files":
            self._json(model_files_payload())
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self):
        if self.path.split("?")[0] != "/chat":
            self._json({"error": "not found"}, 404)
            return
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            body = {}
        prompt = body.get("prompt", "")
        reply = "【本地模拟模型】收到你的问题：" + prompt
        self._json({"answer": reply})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print("mock model server -> http://127.0.0.1:%d" % PORT)
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()