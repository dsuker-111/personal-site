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
  '用 TRAE 训练 LoRA 模型有哪些步骤？',
  '什么是 Qwen2.5-Instruct 模型？'
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
        <p>这是基于 Vue 3 的个人网页。登录后可在底部与由 <strong>TRAE</strong> 训练的本地模型对话。</p>
        <div class="model-tag">模型：Qwen2.5-0.5B-Instruct · LoRA (lora_qa)</div>
      </section>

      <section class="panel">
        <h3>AI 助手</h3>
        <p class="panel-desc">下方对话框将连接本机模型服务（http://127.0.0.1:8000）。首次使用请先运行 <code>server/web_api.py</code>。</p>

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