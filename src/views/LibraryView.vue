<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadProfile } from '../store/profile'
import { listFiles, uploadFile, deleteFile, downloadFileResource as downloadFile, formatSize } from '../api/files'
import UserMenu from '../components/UserMenu.vue'

const files = ref([])
const loading = ref(false)
const error = ref('')
const toast = ref('')
const filter = ref('all')
const preview = ref(null)
const uploading = ref([])
const dragging = ref(false)
const picker = ref(null)

let toastTimer = null
function notify(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

const counts = computed(() => ({
  all: files.value.length,
  image: files.value.filter((f) => f.kind === 'image').length,
  video: files.value.filter((f) => f.kind === 'video').length,
  file: files.value.filter((f) => f.kind === 'file').length
}))

const filtered = computed(() =>
  filter.value === 'all' ? files.value : files.value.filter((f) => f.kind === filter.value)
)

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' },
  { key: 'file', label: '文件' }
]

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    files.value = await listFiles()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleFiles(fileList) {
  const arr = Array.from(fileList || [])
  if (!arr.length) return

  for (const file of arr) {
    if (file.size > 20 * 1024 * 1024) {
      notify(`${file.name} 超过 20MB，已跳过`)
      continue
    }
    const item = { name: file.name, progress: 0, error: '' }
    uploading.value.push(item)
    try {
      await uploadFile(file, (p) => (item.progress = p))
      item.progress = 100
    } catch (e) {
      item.error = e.message || '上传失败'
      notify(`${file.name}：${item.error}`)
    }
  }

  const failed = uploading.value.filter((u) => u.error).length
  uploading.value = []
  await refresh()
  if (!failed) notify('上传完成')
}

function onDrop(e) {
  dragging.value = false
  handleFiles(e.dataTransfer.files)
}

function onPick(e) {
  handleFiles(e.target.files)
  e.target.value = ''
}

async function remove(f) {
  if (!window.confirm(`确定删除「${f.name}」？`)) return
  try {
    await deleteFile(f.path)
    files.value = files.value.filter((x) => x.path !== f.path)
    notify('已删除')
  } catch (e) {
    notify('删除失败：' + (e.message || ''))
  }
}

async function download(f) {
  try {
    await downloadFile(f)
  } catch (e) {
    notify('下载失败：' + (e.message || ''))
  }
}

onMounted(() => {
  loadProfile()
  refresh()
})
</script>

<template>
  <div class="lib-shell">
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">AI</span>
        <span class="app-name">资源库</span>
        <router-link class="nav-link" to="/">← 返回主页</router-link>
      </div>
      <div class="topbar-right">
        <UserMenu />
      </div>
    </header>

    <main class="lib-main">
      <section class="lib-head">
        <div>
          <h2>我的资源库</h2>
          <p>上传图片、视频与文件，换一台电脑打开这个网址也能直接查看和下载。</p>
        </div>
        <div class="head-actions">
          <button class="primary-btn" @click="picker && picker.click()">上传文件</button>
          <button class="ghost-btn" :disabled="loading" @click="refresh">
            {{ loading ? '刷新中…' : '刷新' }}
          </button>
        </div>
      </section>

      <input ref="picker" class="hidden-input" type="file" multiple @change="onPick" />

      <div
        class="dropzone"
        :class="{ dragging }"
        @click="picker && picker.click()"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <div class="drop-icon">＋</div>
        <p class="drop-title">点击选择，或把文件拖到这里</p>
        <p class="drop-sub">支持图片 / 视频 / 任意文件，单个最大 20MB</p>
      </div>

      <div v-if="uploading.length" class="uploading">
        <div v-for="(u, i) in uploading" :key="i" class="upload-row">
          <span class="upload-name">{{ u.name }}</span>
          <div class="bar"><div class="bar-fill" :style="{ width: u.progress + '%' }"></div></div>
          <span class="upload-pct">{{ u.progress }}%</span>
        </div>
      </div>

      <div class="toolbar">
        <div class="tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            class="tab"
            :class="{ active: filter === t.key }"
            @click="filter = t.key"
          >
            {{ t.label }}<span class="count">{{ counts[t.key] }}</span>
          </button>
        </div>
      </div>

      <p v-if="error" class="alert">{{ error }}</p>

      <div v-if="loading && !files.length" class="grid">
        <div v-for="n in 6" :key="n" class="card skeleton"></div>
      </div>

      <div v-else-if="!filtered.length" class="empty">
        <div class="empty-icon">🗂️</div>
        <p>这里还没有内容，上传第一个文件吧</p>
      </div>

      <div v-else class="grid">
        <article v-for="f in filtered" :key="f.path" class="card">
          <div class="thumb" @click="preview = f">
            <img v-if="f.kind === 'image'" :src="f.url" :alt="f.name" loading="lazy" />
            <video v-else-if="f.kind === 'video'" :src="f.url" preload="metadata" muted></video>
            <div v-else class="file-glyph">
              <span class="glyph-ext">{{ (f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4) }}</span>
            </div>
            <span class="badge">{{ f.kind === 'image' ? '图片' : f.kind === 'video' ? '视频' : '文件' }}</span>
          </div>
          <div class="meta">
            <p class="name" :title="f.name">{{ f.name }}</p>
            <p class="size">{{ formatSize(f.size) }}</p>
          </div>
          <div class="card-actions">
            <button class="mini" @click="preview = f">预览</button>
            <button class="mini" @click="download(f)">下载</button>
            <button class="mini danger" @click="remove(f)">删除</button>
          </div>
        </article>
      </div>
    </main>

    <div v-if="preview" class="lightbox" @click.self="preview = null">
      <button class="close" @click="preview = null">×</button>
      <div class="lightbox-body">
        <img v-if="preview.kind === 'image'" :src="preview.url" :alt="preview.name" />
        <video v-else-if="preview.kind === 'video'" :src="preview.url" controls autoplay></video>
        <div v-else class="file-preview">
          <div class="glyph-ext big">{{ (preview.name.split('.').pop() || 'FILE').toUpperCase() }}</div>
          <p>{{ preview.name }}</p>
          <p class="size">{{ formatSize(preview.size) }}</p>
          <button class="primary-btn" @click="download(preview)">下载到本地</button>
        </div>
      </div>
      <p class="lightbox-name">{{ preview.name }}</p>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.lib-shell {
  min-height: 100vh;
  background: #f5f7fb;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  background: #fff;
  border-bottom: 1px solid var(--border, #e2e8f0);
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--primary, #4f46e5), var(--primary-2, #7c3aed));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.app-name {
  font-weight: 700;
  color: var(--text, #0f172a);
}
.nav-link {
  margin-left: 8px;
  font-size: 13px;
  color: var(--primary, #4f46e5);
  text-decoration: none;
}
.nav-link:hover {
  text-decoration: underline;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
/* 浅色顶栏里，用户菜单的文字要用深色 */
.topbar-right :deep(.user-chip) {
  color: var(--text-soft, #64748b);
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-soft, #64748b);
}
.avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--bg-2, #1e293b);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
}

.lib-main {
  max-width: 1180px;
  margin: 0 auto;
  padding: 26px 28px 60px;
}
.lib-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.lib-head h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: var(--text, #0f172a);
}
.lib-head p {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-soft, #64748b);
}
.head-actions {
  display: flex;
  gap: 10px;
}
.primary-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary, #4f46e5), var(--primary-2, #7c3aed));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.primary-btn:hover {
  filter: brightness(1.07);
}
.ghost-btn {
  padding: 9px 16px;
  border: 1px solid var(--border, #e2e8f0);
  background: #fff;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text, #0f172a);
  cursor: pointer;
}
.ghost-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hidden-input {
  display: none;
}

.dropzone {
  border: 2px dashed #c7d2fe;
  background: #fff;
  border-radius: 16px;
  padding: 26px;
  text-align: center;
  cursor: pointer;
  transition: all 0.18s ease;
  margin-bottom: 16px;
}
.dropzone:hover,
.dropzone.dragging {
  border-color: var(--primary, #4f46e5);
  background: #eef2ff;
}
.drop-icon {
  font-size: 26px;
  color: var(--primary, #4f46e5);
  line-height: 1;
}
.drop-title {
  margin: 8px 0 4px;
  font-weight: 600;
  color: var(--text, #0f172a);
}
.drop-sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-soft, #64748b);
}

.uploading {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: grid;
  gap: 10px;
}
.upload-row {
  display: grid;
  grid-template-columns: 1fr 160px 44px;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.upload-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text, #0f172a);
}
.bar {
  height: 6px;
  background: #eef2ff;
  border-radius: 99px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary, #4f46e5), var(--primary-2, #7c3aed));
  transition: width 0.25s ease;
}
.upload-pct {
  color: var(--text-soft, #64748b);
  text-align: right;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.tabs {
  display: flex;
  gap: 6px;
  background: #eef2f7;
  padding: 4px;
  border-radius: 12px;
}
.tab {
  border: none;
  background: transparent;
  padding: 8px 14px;
  border-radius: 9px;
  font-size: 13.5px;
  color: var(--text-soft, #64748b);
  cursor: pointer;
}
.tab.active {
  background: #fff;
  color: var(--text, #0f172a);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.count {
  margin-left: 6px;
  font-size: 11.5px;
  opacity: 0.65;
}

.alert {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
.card {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}
.card.skeleton {
  height: 220px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 400% 100%;
  animation: shimmer 1.3s infinite;
}
@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}
.thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #eef2f7;
  display: grid;
  place-items: center;
  cursor: zoom-in;
  overflow: hidden;
}
.thumb img,
.thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb video {
  pointer-events: none;
}
.badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}
.file-glyph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
}
.glyph-ext {
  color: var(--primary, #4f46e5);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 1px;
}
.glyph-ext.big {
  font-size: 40px;
}
.meta {
  padding: 10px 12px 4px;
}
.name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.size {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-soft, #64748b);
}
.card-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px 12px;
}
.mini {
  flex: 1;
  padding: 6px 0;
  font-size: 12.5px;
  border: 1px solid var(--border, #e2e8f0);
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text, #0f172a);
}
.mini:hover {
  background: #f8fafc;
}
.mini.danger {
  color: #b91c1c;
  border-color: #fecaca;
}
.mini.danger:hover {
  background: #fef2f2;
}

.empty {
  text-align: center;
  padding: 70px 0;
  color: var(--text-soft, #64748b);
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 24, 0.9);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: 40px 20px;
}
.lightbox-body img,
.lightbox-body video {
  max-width: 88vw;
  max-height: 76vh;
  border-radius: 12px;
  background: #000;
  display: block;
}
.file-preview {
  background: #fff;
  padding: 30px 40px;
  border-radius: 16px;
  text-align: center;
}
.file-preview p {
  margin: 6px 0;
}
.lightbox-name {
  position: absolute;
  bottom: 18px;
  color: #e2e8f0;
  font-size: 13px;
}
.close {
  position: absolute;
  top: 16px;
  right: 22px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 30px;
  cursor: pointer;
  line-height: 1;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13.5px;
  z-index: 80;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .lib-main {
    padding: 18px 14px 50px;
  }
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  .upload-row {
    grid-template-columns: 1fr 90px 40px;
  }
}
</style>