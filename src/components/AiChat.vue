<script setup>
import { ref, nextTick, onMounted, computed } from 'vue'
import { chat, checkHealth, MODEL } from '../api/model'

const modelName = ref(MODEL.fallbackName)
const provider = ref('阿里云百炼')

const messages = ref([
  { role: 'ai', text: '你好！我是这个个人网页里的 AI 助手，当前由阿里云百炼的 deepseek-v4.1-flash 提供服务。有什么可以帮你？' }
])
const input = ref('')
const busy = ref(false)
const status = ref({ state: 'checking', text: '正在检测 AI 服务…' })
const listEl = ref(null)
const inputEl = ref(null)

const modelLabel = computed(() => modelName.value || MODEL.fallbackName)

// 判断是否为「公网 HTTPS 页面访问本机」场景——此时浏览器会拦截，需要用户授权本地网络访问
const needsLocalNetworkGrant = computed(() => {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  const isLocal = h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
  return window.location.protocol === 'https:' && !isLocal
})

const offlineHint = computed(() => {
  if (needsLocalNetworkGrant.value) {
    return '无法访问本机 AI 代理。若代理已在运行，请在浏览器提示「访问本地网络」时点【允许】；'
      + '或在地址栏左侧站点设置中开启本地网络访问权限。也可改用本地方式访问本站。'
  }
  return '未检测到 AI 代理服务 (' + MODEL.url + ')。请运行 server/cloud_api.py 并配置 DASHSCOPE_API_KEY。'
})

// 健康检查
async function ping() {
  const res = await checkHealth()
  if (res.online) {
    modelName.value = res.model
    if (res.provider === 'aliyun-dashscope') provider.value = '阿里云百炼'
    if (res.keyConfigured === false) {
      status.value = {
        state: 'offline',
        text: '代理已启动，但未配置 DASHSCOPE_API_KEY（请在启动 cloud_api.py 前设置环境变量）'
      }
    } else {
      status.value = { state: 'online', text: '已连接 · ' + modelLabel.value }
    }
  } else {
    status.value = { state: 'offline', text: offlineHint.value }
  }
  return res.online
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

  try {
    const res = await chat(text, { history, maxNewTokens: 512, temperature: 0.7 })
    if (res.model) modelName.value = res.model
    addMessage('ai', (res.answer && res.answer.trim()) ? res.answer : '（模型没有返回内容）')
    status.value = { state: 'online', text: '已连接 · ' + modelLabel.value }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err)
    const online = await ping()
    addMessage('ai', online
      ? '请求失败：' + msg
      : '无法连接 AI 服务。' + offlineHint.value)
  } finally {
    busy.value = false
    if (inputEl.value) inputEl.value.focus()
  }
}

onMounted(ping)

// 暴露给父组件（主页快捷提问按钮调用）
defineExpose({ send })
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