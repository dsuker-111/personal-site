<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { chat, checkHealth, MODEL } from '../api/model'

const messages = ref([
  { role: 'ai', text: '你好！我是本地训练的个人 AI 助手（Qwen2.5-0.5B-Instruct + LoRA）。有什么可以帮你？' }
])
const input = ref('')
const busy = ref(false)
const status = ref({ state: 'checking', text: '正在检测本地模型服务…' })
const listEl = ref(null)
const inputEl = ref(null)

// 健康检查
async function ping() {
  const res = await checkHealth()
  if (res.online) {
    status.value = { state: 'online', text: '本地模型已连接' }
  } else {
    status.value = { state: 'offline', text: '未检测到本地模型服务 (' + MODEL.url + ')。请运行 server/web_api.py。' }
  }
  return res.online && res
}

function addMessage(role, text) {
  messages.value.push({ role, text })
  scroll()
}

async function scroll() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

async function send(pre = '') {
  const text = (pre && pre.trim()) || input.value.trim()
  if (!text || busy.value) return
  input.value = ''
  addMessage('user', text)
  busy.value = true

  const history = messages.value
    .filter((m) => m.role === 'user' || m.role === 'ai')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.text }))

  let onlineBefore = status.value.state === 'online'
  try {
    const res = await chat(text, { history, max_new_tokens: 320, temperature: 0.2 })
    addMessage('ai', (res.answer && res.answer.trim()) ? res.answer : '（模型没有返回内容）')
    if (!onlineBefore) status.value = { state: 'online', text: '本地模型已连接' }
  } catch (err) {
    const online = await ping()
    addMessage('ai', online
      ? '连接模型时出错：' + (err && err.message ? err.message : String(err))
      : '无法连接本地模型。请确认已运行 server/web_api.py（端口 8000），且已用 TRAE 完成 Qwen2.5-0.5B-Instruct + LoRA(lora_qa) 的训练。')
  } finally {
    busy.value = false
    if (inputEl.value) inputEl.value.focus()
  }
}

onMounted(ping)
</script>

<template>
  <div class="ai-chat" :class="{ 'is-busy': busy }">
    <div class="chat-status" :data-state="status.state">{{ status.text }}</div>

    <div class="chat-list" ref="listEl">
      <div v-for="(m, i) in messages" :key="i" class="msg" :class="'msg-' + m.role">
        <div class="bubble">{{ m.text }}</div>
      </div>
      <div v-if="busy" class="msg msg-ai">
        <div class="bubble typing"><span></span><span></span><span></span></div>
      </div>
    </div>

    <form class="chat-form" @submit.prevent="send()">
      <textarea
        ref="inputEl"
        v-model="input"
        rows="1"
        placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
        @keydown.enter.exact.prevent="send()"
      ></textarea>
      <button class="send-btn" type="submit" :disabled="busy || !input.trim()">
        <span v-if="busy" class="spinner"></span>
        <span v-else>发送</span>
      </button>
    </form>
  </div>
</template>