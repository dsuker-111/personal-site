# 模拟模型服务，用于端到端测试前端「本地模型」流程。
# 仅用于验证前端链路，实际运行请用 server/web_api.py（加载 Qwen + LoRA）。
#
# 与 web_api.py 保持同样的接口和 CORS 行为：
#   GET  /health -> {"status":"ok","model":...,"lora":true}
#   POST /chat   -> {"answer": "..."}
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os

PORT = int(os.environ.get("PORT", "8000"))


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
        if self.path.split("?")[0] == "/health":
            self._json({
                "status": "ok",
                "model": "Qwen2.5-0.5B-Instruct (mock)",
                "lora": True,
            })
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