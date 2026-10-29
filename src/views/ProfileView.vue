<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadProfile, saveProfile, profile, AVATARS } from '../store/profile'
import { HOT_CITIES } from '../api/weather'

const router = useRouter()
const toast = ref('')
const error = ref('')

// 草稿：取消时不影响正式数据
const draft = ref({ nickname: '', avatar: '', bio: '', city: '' })

onMounted(() => {
  loadProfile()
  draft.value = {
    nickname: profile.nickname,
    avatar: profile.avatar,
    bio: profile.bio,
    city: profile.city
  }
})

const dirty = computed(
  () =>
    draft.value.nickname !== profile.nickname ||
    draft.value.avatar !== profile.avatar ||
    draft.value.bio !== profile.bio ||
    draft.value.city !== profile.city
)

const canSave = computed(() => draft.value.nickname.trim().length > 0 && dirty.value)

function pickAvatar(a) {
  draft.value.avatar = a
}

function reset() {
  draft.value = {
    nickname: profile.nickname,
    avatar: profile.avatar,
    bio: profile.bio,
    city: profile.city
  }
  error.value = ''
}

function save(target = '/') {
  const nickname = draft.value.nickname.trim()
  if (!nickname) {
    error.value = '昵称不能为空'
    return
  }
  error.value = ''
  saveProfile({
    nickname,
    avatar: draft.value.avatar || '🙂',
    bio: draft.value.bio.trim(),
    city: draft.value.city.trim() || '杭州'
  })
  toast.value = '已保存，正在返回主页…'
  setTimeout(() => router.push(target), 700)
}

function cancel() {
  router.push('/')
}
</script>

<template>
  <div class="profile-shell">
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">AI</span>
        <span class="app-name">个人信息</span>
        <router-link class="nav-link" to="/">← 返回主页</router-link>
      </div>
    </header>

    <main class="profile-main">
      <section class="pf-card">
        <div class="pf-preview">
          <div class="pf-avatar">{{ draft.avatar || '🙂' }}</div>
          <h2>{{ draft.nickname || '未命名' }}</h2>
          <p class="pf-bio">{{ draft.bio || '这个人很懒，什么都没写。' }}</p>
          <p class="pf-city">默认城市：{{ draft.city || '杭州' }}</p>
        </div>

        <form class="pf-form" @submit.prevent="save('/')">
          <div class="pf-field">
            <span class="pf-label">头像</span>
            <div class="pf-avatars">
              <button
                v-for="a in AVATARS"
                :key="a"
                type="button"
                class="pf-avatar-opt"
                :class="{ active: draft.avatar === a }"
                @click="pickAvatar(a)"
              >{{ a }}</button>
            </div>
          </div>

          <label class="pf-field">
            <span class="pf-label">昵称</span>
            <input v-model="draft.nickname" type="text" maxlength="12" placeholder="最多 12 个字" />
          </label>

          <label class="pf-field">
            <span class="pf-label">个性签名</span>
            <textarea v-model="draft.bio" rows="2" maxlength="40" placeholder="一句话介绍自己（最多 40 字）"></textarea>
          </label>

          <label class="pf-field">
            <span class="pf-label">默认城市</span>
            <input v-model="draft.city" type="text" list="pf-city-list" maxlength="20" placeholder="打开主页时默认查看的天气城市" />
            <datalist id="pf-city-list">
              <option v-for="c in HOT_CITIES" :key="c" :value="c" />
            </datalist>
          </label>

          <p v-if="error" class="pf-error">{{ error }}</p>

          <div class="pf-actions">
            <button class="pf-btn primary" type="submit" :disabled="!canSave">
              保存并继续浏览
            </button>
            <button class="pf-btn" type="button" :disabled="!dirty" @click="reset">撤销修改</button>
            <button class="pf-btn ghost" type="button" @click="cancel">返回</button>
          </div>

          <p class="pf-hint">
            修改会保存在本机浏览器，并立即更新顶栏、主页问候语与默认天气城市。
          </p>
        </form>
      </section>
    </main>

    <transition name="pf-toast">
      <div v-if="toast" class="pf-toast">{{ toast }}</div>
    </transition>
  </div>
</template>
<style scoped>
.profile-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fb;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  background: #fff;
  border-bottom: 1px solid var(--border);
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
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.app-name {
  font-weight: 700;
  color: var(--text);
}

.nav-link {
  margin-left: 8px;
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;
}

.nav-link:hover {
  text-decoration: underline;
}

.profile-main {
  flex: 1;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 20px 60px;
}

.pf-card {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 28px;
  background: #fff;
  border-radius: 18px;
  padding: 26px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.pf-preview {
  text-align: center;
  padding-right: 24px;
  border-right: 1px solid var(--border);
}

.pf-avatar {
  width: 84px;
  height: 84px;
  margin: 4px auto 14px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  font-size: 42px;
  background: #eef2ff;
}

.pf-preview h2 {
  font-size: 19px;
  margin-bottom: 8px;
  word-break: break-all;
}

.pf-bio {
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.6;
  min-height: 42px;
}

.pf-city {
  margin-top: 12px;
  font-size: 12px;
  color: var(--primary);
  background: #eef2ff;
  border-radius: 999px;
  padding: 4px 12px;
  display: inline-block;
}

.pf-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pf-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pf-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-soft);
}

.pf-field input,
.pf-field textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  outline: none;
  resize: vertical;
  transition: border-color .18s, box-shadow .18s;
}

.pf-field input:focus,
.pf-field textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.pf-avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pf-avatar-opt {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: transform .14s, border-color .14s, background .14s;
}

.pf-avatar-opt:hover {
  transform: translateY(-2px);
  background: #f8fafc;
}

.pf-avatar-opt.active {
  border-color: var(--primary);
  background: #eef2ff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.pf-error {
  color: #dc2626;
  font-size: 13px;
}

.pf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.pf-btn {
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  transition: background .18s, border-color .18s, opacity .18s;
}

.pf-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.pf-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.pf-btn.primary {
  border: none;
  color: #fff;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.28);
}

.pf-btn.primary:hover:not(:disabled) {
  filter: brightness(1.08);
}

.pf-btn.ghost {
  background: transparent;
}

.pf-hint {
  font-size: 12px;
  color: var(--text-soft);
  line-height: 1.6;
}

.pf-toast {
  position: fixed;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  padding: 11px 20px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  font-size: 13.5px;
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.35);
  z-index: 100;
}

.pf-toast-enter-active,
.pf-toast-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}

.pf-toast-enter-from,
.pf-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (max-width: 760px) {
  .pf-card {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .pf-preview {
    padding-right: 0;
    padding-bottom: 18px;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .topbar {
    padding: 12px 16px;
  }
}
</style>

