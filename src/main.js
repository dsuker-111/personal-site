import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { auth } from './store/auth'

import './assets/main.css'

// 全站背景：照片层（轻微模糊）+ 浅色蒙层，卡片浮在上面
// 用 BASE_URL 拼相对路径，兼容 GitHub Pages 的 /personal-site/ 子路径
function applySiteBackground() {
  const url = `${import.meta.env.BASE_URL}bg/museum.jpg`

  // 照片层：固定定位 + 模糊，避免背景细节干扰文字
  const photo = document.createElement('div')
  photo.id = 'site-bg-photo'
  photo.setAttribute('aria-hidden', 'true')
  photo.style.cssText = [
    'position:fixed',
    'inset:-28px',
    'z-index:-2',
    `background:url("${url}") center/cover no-repeat`,
    'filter:blur(3px) saturate(1.12) brightness(0.94)',
    'transform:scale(1.01)',
    'pointer-events:none'
  ].join(';')

  // 蒙层：上浅下深，保证正文区域可读
  const veil = document.createElement('div')
  veil.id = 'site-bg-veil'
  veil.setAttribute('aria-hidden', 'true')
  veil.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:-1',
    'background:linear-gradient(180deg, rgba(245,247,251,.46) 0%, rgba(238,242,247,.6) 45%, rgba(226,232,240,.7) 100%)',
    'pointer-events:none'
  ].join(';')

  document.body.prepend(veil)
  document.body.prepend(photo)
  document.body.style.background = '#eef2f7'
  document.body.classList.add('has-photo-bg')
}

applySiteBackground()

// 启动时恢复会话：云端优先，连不上就快速降级到本地账号，绝不让首屏卡住
async function boot() {
  await Promise.race([
    auth.checkSession(),
    new Promise((resolve) => setTimeout(resolve, 3000))
  ])

  router.beforeEach((to) => {
    if (to.meta.requiresAuth && !auth.isLoggedIn()) {
      to.meta.redirected = true
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  })

  createApp(App).use(router).mount('#app')
}

boot()