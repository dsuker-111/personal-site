import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { auth } from './store/auth'

import './assets/main.css'

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