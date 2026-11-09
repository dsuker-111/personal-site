// 构建后处理：把 JS / CSS 全部内联进 index.html，产出单文件页面。
// 目的：静态托管上只有一次请求，避免「HTML 命中缓存但 JS 已被替换成新文件名」导致的白屏。
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')
const indexPath = join(dist, 'index.html')

if (!existsSync(indexPath)) {
  console.error('[inline] 未找到 dist/index.html')
  process.exit(1)
}

let html = readFileSync(indexPath, 'utf8')

// 1) 内联样式
html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g,
  (_, p) => {
    const css = readFileSync(join(dist, p), 'utf8')
    return `<style>${css}</style>`
  }
)

// 2) 内联入口脚本（module）
html = html.replace(
  /<script[^>]+type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g,
  (_, p) => {
    const js = readFileSync(join(dist, p), 'utf8').replace(/<\/script>/gi, '<\\/script>')
    return `<script type="module">${js}</script>`
  }
)

// 3) 去掉不再需要的预加载提示
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '')

writeFileSync(indexPath, html)
console.log(`[inline] 已内联为单文件页面，index.html ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`)
