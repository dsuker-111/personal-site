<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import { chat, checkHealth, MODEL } from '../api/model'
import { listCloudModels, listLocalModels, probeLocal, inspectLocal, LOCAL_ID, LOCAL_META, isLocalId } from '../api/models'
import { formatSize } from '../api/files'

const MODEL_KEY = 'ps_chat_model'

const cloudModels = ref([])
const localModels = ref([{ ...LOCAL_META }])
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

const isLocal = computed(() => isLocalId(currentModel.value))

const currentMeta = computed(() => {
  const m = cloudModels.value.find((x) => x.id === currentModel.value)
  if (m) return m
  const l = localModels.value.find((x) => x.id === currentModel.value)
  if (l) return l
  if (isLocal.value) return LOCAL_META
  return null
})

const modelLabel = computed(() => (currentMeta.value && currentMeta.value.label) || MODEL.fallbackName)

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
  localModels.value = await listLocalModels()

  let stored = ''
  try {
    stored = localStorage.getItem(MODEL_KEY) || ''
  } catch {
    /* ignore */
  }
  // 老版本存的是 local:qwen-lora，统一迁移到新 id
  if (stored === 'local:qwen-lora') stored = LOCAL_ID

  const valid =
    cloudModels.value.some((m) => m.id === stored) || localModels.value.some((m) => m.id === stored)
  if (valid) currentModel.value = stored
  else currentModel.value = cloudModels.value.length ? cloudModels.value[0].id : MODEL.fallbackName

  await refreshLocal()
  await ping()
})

defineExpose({ send })

// ---------- 本地模型文件检查 ----------
const filesOpen = ref(false)
const filesLoading = ref(false)
const filesError = ref('')
const filesData = ref(null)

async function checkLocalFiles() {
  filesOpen.value = true
  filesLoading.value = true
  filesError.value = ''
  filesData.value = null
  try {
    filesData.value = await inspectLocal(currentModel.value)
  } catch (e) {
    filesError.value = e && e.message ? e.message : String(e)
  } finally {
    filesLoading.value = false
  }
}

function closeFiles() {
  filesOpen.value = false
}

// 弹窗打开时 Esc 只关弹窗，不要顺带把外层对话框关掉
function onFilesKey(e) {
  if (e.key === 'Escape' && filesOpen.value) {
    e.stopPropagation()
    closeFiles()
  }
}

onMounted(() => window.addEventListener('keydown', onFilesKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onFilesKey, true))
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
          <option v-for="m in localModels" :key="m.id" :value="m.id">
            {{ m.label }}{{ localOnline ? '' : '（未启动）' }}
          </option>
        </optgroup>
      </select>
      <span class="model-provider">{{ currentMeta ? currentMeta.provider : '阿里云百炼' }}</span>
      <span v-if="isLocal" class="model-badge" :class="localOnline ? 'on' : 'off'">
        {{ localOnline ? '本机在线' : '本机离线' }}
      </span>
      <button
        v-if="isLocal"
        class="model-check-btn"
        type="button"
        title="检查本机模型文件（LoRA 目录 / 权重 / 依赖）"
        @click="checkLocalFiles"
      >
        🔍 检查模型文件
      </button>
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

    <!-- 本地模型文件检查（弹窗挂到 body，避免被对话框裁剪） -->
    <Teleport to="body">
      <div v-if="filesOpen" class="mf-mask" @click.self="closeFiles">
        <div class="mf-modal" role="dialog" aria-label="本地模型文件检查">
          <header class="mf-head">
            <span>🔍 本地模型文件检查</span>
            <button class="mf-close" title="关闭（Esc）" @click="closeFiles">✕</button>
          </header>

          <div class="mf-body">
            <p v-if="filesLoading" class="mf-loading">正在检查本机模型文件…</p>

            <div v-else-if="filesError" class="mf-error">
              <p class="mf-error-title">检查失败</p>
              <p>{{ filesError }}</p>
              <p class="mf-error-tip">
                本地模型只在运行了 <code>python server/web_api.py</code> 的那台电脑上可用。
              </p>
            </div>

            <template v-else-if="filesData">
              <p v-if="filesData.model_label" class="mf-model">
                {{ filesData.model_label }}
              </p>
              <div class="mf-summary" :class="filesData.ready ? 'ok' : 'bad'">
                <strong>{{ filesData.ready ? 'LoRA 文件齐全，可以加载' : 'LoRA 文件不完整' }}</strong>
                <span>{{ filesData.model }} · {{ filesData.loaded ? '当前已驻留' : '尚未加载' }}</span>
              </div>

              <p class="mf-path">
                LoRA 目录：<code>{{ filesData.lora_dir }}</code>
              </p>

              <ul class="mf-checks">
                <li v-for="c in filesData.checks" :key="c.key" :class="c.ok ? 'on' : 'off'">
                  <span class="mf-mark">{{ c.ok ? '✓' : '✕' }}</span>
                  <span class="mf-label">{{ c.label }}</span>
                  <span class="mf-detail">{{ c.detail }}</span>
                </li>
              </ul>

              <div v-if="filesData.files && filesData.files.length" class="mf-files">
                <p class="mf-files-title">
                  目录内文件 {{ filesData.files.length }} 个 · 共 {{ formatSize(filesData.total_size) }}
                </p>
                <table>
                  <tr v-for="f in filesData.files" :key="f.name">
                    <td class="nm">{{ f.name }}</td>
                    <td class="sz">{{ f.dir ? '目录' : formatSize(f.size) }}</td>
                    <td class="tm">{{ f.mtime }}</td>
                  </tr>
                </table>
              </div>
              <p v-else class="mf-empty">
                目录不存在或是空的 —— 检查 <code>LORA_DIR</code> 环境变量是否指向 TRAE 导出的 lora_qa 目录。
              </p>
            </template>
          </div>

          <footer class="mf-foot">
            <button class="mf-btn" :disabled="filesLoading" @click="checkLocalFiles">重新检查</button>
            <button class="mf-btn primary" @click="closeFiles">关闭</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>