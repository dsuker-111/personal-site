<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth } from '../store/auth'

const router = useRouter()
const route = useRoute()

const tab = ref('login') // 'login' | 'register'
const form = reactive({ username: '', password: '' })
const error = ref('')
const loading = ref(false)

const canSubmit = computed(() => form.username.trim() && form.password.length >= 3)

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    let user
    if (tab.value === 'register') {
      user = auth.register(form.username.trim(), form.password)
      if (!user) { error.value = '该用户名已被注册，请换一个。'; return }
    } else {
      user = auth.login(form.username.trim(), form.password)
      if (!user) { error.value = '用户名或密码错误，请重试。'; return }
    }
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (e) {
    error.value = (e && e.message) || '网络异常'
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

      <div class="login-tabs">
        <button :class="{ active: tab === 'login' }" type="button" @click="tab = 'login'">登录</button>
        <button :class="{ active: tab === 'register' }" type="button" @click="tab = 'register'">注册</button>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">用户名</span>
          <input
            v-model.trim="form.username"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
            autofocus
          />
        </label>

        <label class="field">
          <span class="field-label">密码</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="至少 3 位"
          />
        </label>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="login-btn" type="submit" :disabled="!canSubmit || loading">
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? '处理中…' : (tab === 'register' ? '注 册' : '登 录') }}</span>
        </button>

        <p class="login-hint" v-if="tab === 'register'">注册后个人资料和对话记录保留在本机浏览器，数据通过 Supabase 云端备份</p>
      </form>
    </div>
  </div>
</template>