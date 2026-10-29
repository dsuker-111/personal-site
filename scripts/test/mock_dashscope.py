"""模拟阿里云百炼 OpenAI 兼容接口，用于验证 cloud_api.py 的转发逻辑。"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Mock(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/chat/completions":
            self.send_response(404); self.end_headers(); return
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n).decode("utf-8") or "{}")
        auth = self.headers.get("Authorization", "")
        model = body.get("model")
        msgs = body.get("messages") or []
        last_user = ""
        for m in reversed(msgs):
            if m.get("role") == "user":
                last_user = m.get("content", "")
                break
        text = (
            "[mock-dashscope] model=%s auth=%s rounds=%d 收到：%s"
            % (model, "Bearer ***" if auth.startswith("Bearer ") else "NONE", len(msgs), last_user)
        )
        out = json.dumps({"choices": [{"message": {"role": "assistant", "content": text}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8899), Mock).serve_forever()