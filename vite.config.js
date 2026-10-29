import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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