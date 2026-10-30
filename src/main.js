import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { auth } from './store/auth'

import './assets/main.css'

// 路由守卫：未登录跳转登录页
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.isLoggedIn()) {
    to.meta.redirected = true
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

createApp(App).use(router).mount('#app')