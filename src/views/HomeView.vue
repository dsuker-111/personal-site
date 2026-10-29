<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../store/auth'
import AiChat from '../components/AiChat.vue'

const router = useRouter()
const user = ref(auth.currentUser())

const quickQuestions = [
  '你好，介绍一下自己',
  '你能做些什么？',
  '介绍一下 deepseek-v4.1-flash 的特点',
  '写一段 Vue 3 的组合式 API 示例'
]

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
        <p>这是基于 Vue 3 的个人网页。登录后可在下方 AI 助手中对话，支持切换多个云端模型，也能接入本机训练的 LoRA 模型。</p>
        <div class="model-tag">模型：deepseek-v4.1-flash / qwen-plus / qwen-max / qwen-long · 阿里云百炼</div>
      </section>

      <section class="panel">
        <h3>AI 助手</h3>
        <p class="panel-desc">对话框上方可切换模型：云端模型经阿里云百炼提供服务，打开网页即可用；本地模型需要在你自己的电脑上运行 <code>server/web_api.py</code>。</p>

        <div class="quick">
          <span class="quick-label">试试：</span>
          <button
            v-for="q in quickQuestions"
            :key="q"
            class="quick-btn"
            @click="$refs.chat.send(q)"
          >{{ q }}</button>
        </div>

        <AiChat ref="chat" />
      </section>
    </main>

    <footer class="footer">
      QQ 软件开发工程实践 · 个人网页 V1.0
    </footer>
  </div>
</template>