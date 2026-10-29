"""在本地把 server-fc/index.py 跑起来（不依赖阿里云函数计算），用于自测接口。

用法（PowerShell）：
    $env:GITHUB_TOKEN="..."; $env:AUTH_PASSWORD="123456"
    python server-fc/dev_server.py          # 默认 http://127.0.0.1:8787

它把 HTTP 请求包装成函数计算的事件格式，调用同一个 handler，
所以本地验证过的行为与线上基本一致（差异仅在阿里云运行时本身）。
"""

import base64
import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import index as fn  # noqa: E402

PORT = int(os.environ.get("PORT", "8787"))


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _dispatch(self, method):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""

        event = {
            "rawPath": parsed.path,
            "httpMethod": method,
            "headers": {k.lower(): v for k, v in self.headers.items()},
            "queryParameters": {k: v[0] for k, v in parse_qs(parsed.query).items()},
            "body": raw.decode("utf-8", "ignore") if raw else "",
            "isBase64Encoded": False,
            "requestContext": {"http": {"method": method, "path": parsed.path}},
        }

        try:
            resp = fn.handler(json.dumps(event).encode("utf-8"), None)
        except Exception:
            traceback.print_exc()
            resp = {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"ok": False, "error": "dev server crash"}),
            }

        body = resp.get("body", "")
        data = base64.b64decode(body) if resp.get("isBase64Encoded") else str(body).encode("utf-8")
        headers = dict(resp.get("headers") or {})

        self.send_response(resp.get("statusCode", 200))
        for k, v in headers.items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if method != "HEAD":
            self.wfile.write(data)

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def do_DELETE(self):
        self._dispatch("DELETE")

    def do_OPTIONS(self):
        self._dispatch("OPTIONS")

    def log_message(self, fmt, *args):
        sys.stderr.write("[dev] %s\n" % (fmt % args))


if __name__ == "__main__":
    print("=" * 56)
    print("  本地函数服务  http://127.0.0.1:%d" % PORT)
    print("  GitHub 仓库   : %s/%s @ %s" % (fn.GITHUB_OWNER, fn.GITHUB_REPO, fn.GITHUB_BRANCH))
    print("  登录密码      : %s" % ("已配置" if fn.AUTH_PASSWORD else "未配置!"))
    print("  AI Key        : %s" % ("已配置" if fn.DASHSCOPE_API_KEY else "未配置"))
    print("=" * 56)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()