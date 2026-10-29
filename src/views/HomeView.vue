<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../store/auth'
import WeatherPanel from '../components/WeatherPanel.vue'
import ChatWidget from '../components/ChatWidget.vue'

const router = useRouter()
const user = ref(auth.currentUser())
// 构建时由 vite.config.js 注入（来源：仓库根目录 VERSION）
const version = __APP_VERSION__

function logout() {
  auth.logout()
  router.replace('/login')
}
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
        <span class="user-chip">
          <span class="avatar">{{ (user && user.nickname) ? user.nickname[0] : 'U' }}</span>
          {{ user && user.nickname }}
        </span>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </header>

    <main class="content">
      <section class="hero">
        <h2>欢迎回来，{{ user && user.nickname }}！</h2>
        <p>
          主页展示实时天气，右下角的 <strong>AI 助手</strong> 是一个浮动对话框 —— 点开即可对话，
          支持切换云端模型，也能接入本机训练的 LoRA 模型。
        </p>
      </section>

      <!-- 主界面：天气 -->
      <WeatherPanel />
    </main>

    <footer class="footer">
      QQ 软件开发工程实践 · 个人网页 v{{ version }} · 天气 + AI 助手
    </footer>

    <!-- AI 对话：浮动对话框 -->
    <ChatWidget />
  </div>
</template>