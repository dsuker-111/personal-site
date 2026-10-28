// 简易静态服务器：模拟 GitHub Pages 子路径托管 dist/，验证相对路径构建可正常加载。
import { createServer } from "node:http";
import { createReadStream, stat } from "node:fs";
import { join, resolve, extname } from "node:path";

const root = resolve(process.cwd(), "dist");
const PORT = 4176;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  // 去掉任意前缀（模拟 /<repo>/...），落到 dist 内
  let rel = urlPath.replace(/^\/+/, "").replace(/^[^/]+\//, "");
  if (rel === "") rel = "index.html";
  const file = resolve(root, rel);
  if (!file.startsWith(root + "\\") && file !== root) { res.writeHead(403); res.end(); return; }
  stat(file, (err, info) => {
    if (err || !info.isFile()) { res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
}).listen(PORT, "127.0.0.1", () => console.log("static @ http://127.0.0.1:" + PORT));