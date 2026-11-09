<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth } from '../store/auth'
import { loadProfile } from '../store/profile'
import ProfileShowcase from '../components/ProfileShowcase.vue'

const router = useRouter()
const route = useRoute()

// 登录弹窗
const showAuth = ref(false)
// 默认 tab：登录/注册可切换（从 URL 参数支持直达注册）
const tab = ref(route.query.tab === 'register' ? 'register' : 'login')
const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

// 已登录则右上角按钮变成「进入主页」
const loggedIn = computed(() => auth.isLoggedIn())

// 加载公开资料卡
onMounted(async () => {
  await loadProfile()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})

function onKey(e) {
  if (e.key === 'Escape' && showAuth.value) closeAuth()
}

const canSubmit = computed(() => form.email.trim().includes('@') && form.password.length >= 6)

function openAuth() {
  if (loggedIn.value) {
    router.push('/')
    return
  }
  error.value = ''
  showAuth.value = true
  if (route.query.tab === 'register') tab.value = 'register'
}

function closeAuth() {
  showAuth.value = false
  error.value = ''
}

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    if (tab.value === 'register') {
      await auth.register(form.email.trim(), form.password)
    } else {
      await auth.login(form.email.trim(), form.password)
    }
    // 刷新缓存
    await auth.currentUser()
    showAuth.value = false
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (e) {
    error.value = (e && (e.message || e.code)) || '网络异常'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="showcase-page">
    <!-- 顶栏：品牌 + 右上角小登录按钮 -->
    <header class="showcase-top">
      <div class="showcase-brand">
        <span class="brand-logo">主</span>
        <span class="showcase-name">个人主页</span>
      </div>
      <button class="auth-trigger" type="button" @click="openAuth">
        {{ loggedIn ? '进入主页' : '登录' }}
      </button>
    </header>

    <!-- 铺满界面的资料卡片 -->
    <main class="showcase-main">
      <ProfileShowcase />
    </main>

    <footer class="showcase-foot">
      QQ 软件开发工程实践 · 个人网页
    </footer>

    <!-- 登录 / 注册弹窗 -->
    <transition name="auth-fade">
      <div v-if="showAuth" class="auth-mask" @click.self="closeAuth">
        <section class="auth-modal" role="dialog" aria-label="登录或注册">
          <button class="auth-close" type="button" title="关闭（Esc）" @click="closeAuth">✕</button>

          <div class="auth-head">
            <h2>{{ tab === 'login' ? '登录' : '注册' }}</h2>
            <p>{{ tab === 'login' ? '登录后即可编辑个人资料' : '注册新账号，资料云端同步' }}</p>
          </div>

          <div class="login-tabs">
            <button :class="{ active: tab === 'login' }" type="button" @click="tab = 'login'">登录</button>
            <button :class="{ active: tab === 'register' }" type="button" @click="tab = 'register'">注册</button>
          </div>

          <form class="login-form" @submit.prevent="submit">
            <label class="field">
              <span class="field-label">邮箱</span>
              <input
                v-model.trim="form.email"
                type="email"
                autocomplete="email"
                placeholder="请输入邮箱"
                autofocus
              />
            </label>

            <label class="field">
              <span class="field-label">密码</span>
              <input
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                placeholder="至少 6 位"
              />
            </label>

            <p v-if="error" class="form-error">{{ error }}</p>

            <button class="login-btn" type="submit" :disabled="!canSubmit || loading">
              <span v-if="loading" class="spinner"></span>
              <span>{{ loading ? '处理中…' : (tab === 'register' ? '注 册' : '登 录') }}</span>
            </button>

            <p class="login-hint" v-if="tab === 'register'">注册后个人资料自动保存；连不上云端时账号会存在本机</p>
          </form>

          <p class="login-mode">
            云端可用时自动同步账号与资料；<br />
            连不上云端时会自动改用<strong>本机账号</strong>（数据只保存在这台电脑）。
          </p>
        </section>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.showcase-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶栏 */
.showcase-top {
  height: 64px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.showcase-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.showcase-brand .brand-logo {
  width: 34px;
  height: 34px;
  margin: 0;
  border-radius: 10px;
  font-size: 15px;
  box-shadow: 0 6px 14px rgba(79, 70, 229, 0.3);
}

.showcase-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

/* 右上角小登录按钮 */
.auth-trigger {
  padding: 7px 18px;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(10px) saturate(1.05);
  -webkit-backdrop-filter: blur(10px) saturate(1.05);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
  transition: background .18s, border-color .18s, color .18s, transform .12s;
}

.auth-trigger:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  transform: translateY(-1px);
}

/* 主体：铺满 */
.showcase-main {
  flex: 1;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 8px 28px 28px;
}

.showcase-foot {
  padding: 18px 28px 26px;
  text-align: center;
  font-size: 12px;
  color: var(--text-soft);
}

/* 登录弹窗 */
.auth-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.46);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-modal {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px 30px 28px;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.32);
}

.auth-close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: none;
  background: transparent;
  color: var(--text-soft);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
}

.auth-close:hover { color: var(--text); }

.auth-head {
  margin-bottom: 20px;
  text-align: center;
}

.auth-head h2 {
  font-size: 22px;
  color: var(--text);
}

.auth-head p {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-soft);
}

.login-mode {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-soft);
  text-align: center;
}

.login-mode strong {
  color: var(--primary);
}

.auth-fade-enter-active,
.auth-fade-leave-active {
  transition: opacity .18s ease;
}

.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
}
</style>
