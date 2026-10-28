import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { auth } from './store/auth'

import './assets/main.css'

// 在每次路由切换前检查登录状态
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.isLoggedIn()) {
    to.meta.redirected = true
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

createApp(App).use(router).mount('#app')