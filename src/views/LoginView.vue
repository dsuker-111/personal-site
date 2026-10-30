<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth } from '../store/auth'

const router = useRouter()
const route = useRoute()

const tab = ref('login') // 'login' | 'register'
const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

const canSubmit = computed(() => form.email.trim() && form.password.length >= 6)

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    let user
    if (tab.value === 'register') {
      user = await auth.register(form.email.trim(), form.password)
      if (!user) { error.value = '注册失败，请稍后重试。'; return }
    } else {
      user = await auth.login(form.email.trim(), form.password)
      if (!user) { error.value = '邮箱或密码错误，请重试。'; return }
    }
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (e) {
    error.value = (e && (e.message || e.code)) || '网络异常，请稍后重试。'
  } finally {
    loading.value = false
  }
}

// 回车切换
function onPasswordEnter() {
  if (canSubmit.value && !loading.value) submit()
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-logo">AI</div>
        <h1 class="brand-title">个人主页</h1>
        <p class="brand-sub">登录以进入 AI 助手对话</p>
      </div>

      <!-- 标签切换 -->
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
            placeholder="your@email.com"
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
            @keydown.enter="onPasswordEnter"
          />
        </label>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="login-btn" type="submit" :disabled="!canSubmit || loading">
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? '处理中…' : (tab === 'register' ? '注 册' : '登 录') }}</span>
        </button>

        <p class="login-hint" v-if="tab === 'register'">注册后同一账号可在任何设备登录，个人资料和对话记录云端同步</p>
      </form>
    </div>
  </div>
</template>