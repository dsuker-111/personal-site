# 模拟模型服务，用于端到端测试前端对话流程。
# 仅用于验证，实际运行请用 server/web_api.py（加载 Qwen + LoRA）。
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
        else:
            self.send_response(404); self.end_headers()

    def do_POST(self):
        if self.path == '/chat':
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            prompt = body.get('prompt', '')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            reply = f"【模拟回复】收到你的问题：{prompt}"
            self.wfile.write(json.dumps({'answer': reply}).encode())
        else:
            self.send_response(404); self.end_headers()

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    HTTPServer(('127.0.0.1', 8000), Handler).serve_forever()