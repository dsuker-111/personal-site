import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true, title: '个人主页' }
  },
  {
    path: '/library',
    name: 'library',
    component: () => import('../views/LibraryView.vue'),
    meta: { requiresAuth: true, title: '资源库' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

export const router = createRouter({
  // hash 模式：GitHub Pages 静态托管无需服务器重写，深链接不 404
  history: createWebHashHistory(),
  routes
})

router.afterEach((to) => {
  document.title = to.meta.title ? to.meta.title + ' · 个人主页' : '个人主页'
})