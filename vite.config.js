import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 版本号以仓库根目录的 VERSION 文件为唯一来源，避免多处手改不同步
const APP_VERSION = readFileSync(new URL('./VERSION', import.meta.url), 'utf8').trim()

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION)
  },
  // 相对路径基址：确保部署到 GitHub Pages 子路径也能正确加载静态资源
  base: './',
  server: {
    port: 5173,
    // 后端源码 / 测试产物不参与前端热更新，避免编辑器临时文件把 watcher 搞崩
    watch: {
      ignored: [
        '**/server-fc/**',
        '**/server/**',
        '**/scripts/**',
        '**/.tmpmedia/**',
        '**/dist/**',
        '**/*.tmpdir/**'
      ]
    },
    proxy: {
      // 开发时把 /api 代理到本地模型服务，避免跨域
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})