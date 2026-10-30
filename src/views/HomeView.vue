<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadProfile, profile } from '../store/profile'
import WeatherPanel from '../components/WeatherPanel.vue'
import ChatWidget from '../components/ChatWidget.vue'
import UserMenu from '../components/UserMenu.vue'
import ProfileCard from '../components/ProfileCard.vue'

const router = useRouter()
// 构建时由 vite.config.js 注入（来源：仓库根目录 VERSION）
const version = __APP_VERSION__

onMounted(() => {
  loadProfile()
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
        <!-- 点昵称展开下拉：个人信息 / 资源库 / 退出 -->
        <UserMenu />
      </div>
    </header>

    <main class="content">
      <section class="hero">
        <h2>欢迎回来，{{ profile.nickname }}！</h2>
        <p>
          主页展示实时天气，右下角的 <strong>AI 助手</strong> 是一个浮动对话框 —— 点开即可对话，
          支持切换云端模型，也能接入本机训练的 LoRA 模型。
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

    <!-- AI 对话：浮动对话框 -->
    <ChatWidget />
  </div>
</template>