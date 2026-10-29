<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth } from '../store/auth'

const router = useRouter()
const route = useRoute()

const form = reactive({ username: '', password: '' })
const error = ref('')
const loading = ref(false)

const canSubmit = computed(() => form.username.trim() && form.password)

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    const user = await auth.login(form.username.trim(), form.password)
    if (!user) {
      error.value = '账号或密码错误，请重试。'
      return
    }
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (e) {
    error.value = '登录失败：' + (e && e.message ? e.message : '网络异常')
  } finally {
    loading.value = false
  }
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

      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">账号</span>
          <input
            v-model.trim="form.username"
            type="text"
            autocomplete="username"
            placeholder="请输入账号"
            autofocus
          />
        </label>

        <label class="field">
          <span class="field-label">密码</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
        </label>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="login-btn" type="submit" :disabled="!canSubmit || loading">
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? '登录中…' : '登 录' }}</span>
        </button>

        <p class="login-hint">默认账号：admin　密码：123456</p>
      </form>
    </div>
  </div>
</template>