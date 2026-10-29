// 简易静态服务器：模拟 GitHub Pages 托管 dist/（原样服务 + SPA 回退 index.html）
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, resolve, extname } from "node:path";

const root = resolve(process.cwd(), "dist");
const PORT = Number(process.env.PORT) || 4176;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8"
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let rel = urlPath.replace(/^\/+/, "");
  // 目录路径（如 v1/）补上 index.html，否则会被当成目录而错误回退到根页面
  if (rel === "" || rel.endsWith("/")) rel += "index.html";

  let file = resolve(root, rel);
  // 越界保护
  if (!file.startsWith(root)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, "index.html");
  } catch {
    // SPA 回退：优先用同级目录的 index.html（子应用），再退回根
    const dirIndex = join(resolve(file, ".."), "index.html");
    file = dirIndex.startsWith(root) && (await stat(dirIndex).then((s) => s.isFile()).catch(() => false))
      ? dirIndex
      : join(root, "index.html");
  }

  try {
    const info = await stat(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-cache"
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => console.log("static @ http://127.0.0.1:" + PORT));