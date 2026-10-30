import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { auth } from './store/auth'

import './assets/main.css'

// 启动时先等 Supabase 恢复 session，再检查登录
async function boot() {
  await auth.checkSession()

  router.beforeEach((to) => {
    if (to.meta.requiresAuth && !auth.isLoggedIn()) {
      to.meta.redirected = true
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  })

  createApp(App).use(router).mount('#app')
}

boot()