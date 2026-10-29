<script setup>
import { ref, nextTick, onMounted, computed } from 'vue'
import { chat, checkHealth, MODEL } from '../api/model'
import { listCloudModels, probeLocal, LOCAL_ID, LOCAL_META } from '../api/models'

const MODEL_KEY = 'ps_chat_model'

const cloudModels = ref([])
const currentModel = ref('')
const localOnline = ref(false)
const localReason = ref('')

const messages = ref([
  { role: 'ai', text: '你好！我是这个网页里的 AI 助手。可以在上方「模型」里切换云端模型，或在运行了本地服务的电脑上选择自训练的 LoRA 模型。' }
])
const input = ref('')
const busy = ref(false)
const status = ref({ state: 'checking', text: '正在检测 AI 服务…' })
const listEl = ref(null)
const inputEl = ref(null)

const isLocal = computed(() => currentModel.value === LOCAL_ID)

const currentMeta = computed(() => {
  const m = cloudModels.value.find((x) => x.id === currentModel.value)
  if (m) return m
  if (isLocal.value) return LOCAL_META
  return null
})

const modelLabel = computed(() => {
  if (isLocal.value) return LOCAL_META.label
  return (currentMeta.value && currentMeta.value.label) || MODEL.fallbackName
})

const needsLocalNetworkGrant = computed(() => {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  const isLocalHost = h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
  return window.location.protocol === 'https:' && !isLocalHost
})

const localHint = computed(() => {
  const base = '本地模型服务未启动。请在电脑上运行：python server/web_api.py'
  if (needsLocalNetworkGrant.value) {
    return base + '；若已在运行，请在浏览器提示「访问本地网络」时点【允许】。'
  }
  return base + (localReason.value ? '（' + localReason.value + '）' : '')
})

const offlineHint = computed(() => {
  if (needsLocalNetworkGrant.value) {
    return '无法访问本机 AI 代理。若代理已在运行，请在浏览器提示「访问本地网络」时点【允许】。'
  }
  return '未检测到后端服务 (' + MODEL.url + ')。'
})

async function refreshLocal() {
  const p = await probeLocal()
  localOnline.value = p.online
  localReason.value = p.online ? '' : p.reason || ''
  return p.online
}

async function ping() {
  if (isLocal.value) {
    const ok = await refreshLocal()
    status.value = ok
      ? { state: 'online', text: '已连接 · ' + modelLabel.value + '（本机）' }
      : { state: 'offline', text: localHint.value }
    return ok
  }

  const res = await checkHealth()
  if (res.online) {
    if (res.keyConfigured === false) {
      status.value = { state: 'offline', text: '后端已启动，但未配置 DASHSCOPE_API_KEY' }
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

async function onModelChange() {
  try {
    localStorage.setItem(MODEL_KEY, currentModel.value)
  } catch {
    /* ignore */
  }
  await ping()
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
    const res = await chat(text, {
      model: currentModel.value,
      history,
      maxNewTokens: 512,
      temperature: 0.7
    })
    addMessage('ai', res.answer && res.answer.trim() ? res.answer : '（模型没有返回内容）')
    status.value = {
      state: 'online',
      text: '已连接 · ' + modelLabel.value + (res.local ? '（本机）' : '')
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err)
    const online = await ping()
    addMessage('ai', online ? '请求失败：' + msg : isLocal.value ? localHint.value : '无法连接 AI 服务。' + offlineHint.value)
  } finally {
    busy.value = false
    if (inputEl.value) inputEl.value.focus()
  }
}

onMounted(async () => {
  cloudModels.value = await listCloudModels()

  let stored = ''
  try {
    stored = localStorage.getItem(MODEL_KEY) || ''
  } catch {
    /* ignore */
  }
  const valid = stored === LOCAL_ID || cloudModels.value.some((m) => m.id === stored)
  if (valid) currentModel.value = stored
  else currentModel.value = cloudModels.value.length ? cloudModels.value[0].id : MODEL.fallbackName

  await refreshLocal()
  await ping()
})

defineExpose({ send })
</script>

<template>
  <div class="ai-chat" :class="{ 'is-busy': busy }">
    <div class="chat-models">
      <label class="model-caption" for="model-select">模型</label>
      <select id="model-select" v-model="currentModel" class="model-select" @change="onModelChange">
        <option v-if="!currentModel" disabled value="">加载中…</option>
        <optgroup v-if="cloudModels.length" label="云端 · 任何设备可用">
          <option v-for="m in cloudModels" :key="m.id" :value="m.id">{{ m.label }}</option>
        </optgroup>
        <optgroup label="本地 · 仅本机可用">
          <option :value="LOCAL_ID">
            {{ LOCAL_META.label }}{{ localOnline ? '' : '（未启动）' }}
          </option>
        </optgroup>
      </select>
      <span class="model-provider">{{ currentMeta ? currentMeta.provider : '阿里云百炼' }}</span>
      <span v-if="isLocal" class="model-badge" :class="localOnline ? 'on' : 'off'">
        {{ localOnline ? '本机在线' : '本机离线' }}
      </span>
    </div>

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
        placeholder="输入问题，Enter 发送（Shift+Enter 换行）"
        @keydown.enter.exact.prevent="send()"
      ></textarea>
      <button class="send-btn" type="submit" :disabled="busy || !input.trim()">
        <span v-if="busy" class="spinner"></span>
        <span v-else>发送</span>
      </button>
    </form>
  </div>
</template>