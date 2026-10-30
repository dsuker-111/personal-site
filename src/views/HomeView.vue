<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadProfile, profile } from '../store/profile'
import { auth } from '../store/auth'
import WeatherPanel from '../components/WeatherPanel.vue'
import ChatWidget from '../components/ChatWidget.vue'
import UserMenu from '../components/UserMenu.vue'
import ProfileCard from '../components/ProfileCard.vue'

const router = useRouter()
const route = useRoute()
// 构建时由 vite.config.js 注入（来源：仓库根目录 VERSION）
const version = __APP_VERSION__

// 是否已登录（同步读缓存）
const loggedIn = auth.isLoggedIn()

function goLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

function goRegister() {
  router.push({ name: 'login', query: { redirect: route.fullPath, tab: 'register' } })
}

onMounted(async () => {
  await loadProfile()
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">AI</span>
        <span class="app-name">个人主页</span>
      </div>
      <div class="topbar-right">
        <router-link class="lib-btn" to="/library">资源库</router-link>
        <!-- 未登录：登录/注册；已登录：用户菜单 -->
        <template v-if="loggedIn">
          <UserMenu />
        </template>
        <template v-else>
          <button class="auth-btn" type="button" @click="goRegister">注册</button>
          <button class="auth-btn primary" type="button" @click="goLogin">登录</button>
        </template>
      </div>
    </header>

    <main class="content">
      <section class="hero">
        <h2>{{ loggedIn ? ('欢迎回来，' + profile.nickname + '！') : '你好，我是 ' + (profile.nickname || '这里的主人') + ' 👋' }}</h2>
        <p>
          {{ loggedIn
            ? '主页展示实时天气，右下角的 <strong>AI 助手</strong> 是一个浮动对话框 —— 点开即可对话，支持切换云端模型，也能接入本机训练的 LoRA 模型。'
            : '这是个人主页名片。浏览下方资料了解我；登录后可编辑资料、使用资源库和 AI 助手。' }}
        </p>
      </section>

      <!-- 个人资料（昵称 / 头像 / 经历 / 技能 / 收藏 / 设备） -->
      <ProfileCard />

      <!-- 主界面：天气 -->
      <WeatherPanel />
    </main>

    <footer class="footer">
      QQ 软件开发工程实践 · 个人网页 v{{ version }} · 天气 + AI 助手
    </footer>

    <!-- AI 对话：浮动对话框（登录后可用） -->
    <ChatWidget v-if="loggedIn" />
  </div>
</template>