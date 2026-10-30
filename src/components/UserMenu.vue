<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../store/auth'
import { profile, jobLine } from '../store/profile'

const router = useRouter()
const open = ref(false)
const root = ref(null)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function go(path) {
  close()
  router.push(path)
}

async function logout() {
  close()
  await auth.logout()
  router.replace('/login')
}

// 点空白处 / Esc 收起
function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) close()
}

function onKey(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="user-menu">
    <button class="user-chip" :class="{ open }" :aria-expanded="open" @click="toggle">
      <span class="avatar">
        <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="" />
        <template v-else>{{ profile.avatar }}</template>
      </span>
      <span class="user-name">{{ profile.nickname }}</span>
      <span class="caret">▾</span>
    </button>

    <transition name="um-fade">
      <div v-if="open" class="user-dropdown" role="menu">
        <div class="um-head">
          <span class="um-avatar">
            <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="" />
            <template v-else>{{ profile.avatar }}</template>
          </span>
          <div class="um-id">
            <strong>{{ profile.nickname }}</strong>
            <span v-if="jobLine(profile)" class="um-role">{{ jobLine(profile) }}</span>
            <span>{{ profile.bio }}</span>
          </div>
        </div>

        <button class="um-item" role="menuitem" @click="go('/profile')">
          <span class="um-ico">✎</span> 个人信息
        </button>
        <button class="um-item" role="menuitem" @click="go('/library')">
          <span class="um-ico">🗂</span> 资源库
        </button>
        <div class="um-split"></div>
        <button class="um-item danger" role="menuitem" @click="logout">
          <span class="um-ico">⎋</span> 退出登录
        </button>
      </div>
    </transition>
  </div>
</template>
<style scoped>
.user-menu {
  position: relative;
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 190px;
  padding: 4px 10px 4px 4px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  transition: background .18s, border-color .18s;
}

.user-chip:hover,
.user-chip.open {
  background: rgba(148, 163, 184, 0.18);
  border-color: rgba(148, 163, 184, 0.3);
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 15px;
  line-height: 1;
  background: rgba(148, 163, 184, 0.22);
  flex: none;
}

.avatar img,
.um-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}

.user-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.caret {
  font-size: 9px;
  opacity: .75;
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  width: 238px;
  padding: 8px;
  background: #fff;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 22px 48px rgba(2, 6, 23, 0.36);
  z-index: 90;
}

.um-head {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 10px 12px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.um-avatar {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: #eef2ff;
}

.um-id {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.um-id strong {
  font-size: 14px;
}

.um-role {
  font-size: 11.5px;
  color: var(--primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.um-id span {
  font-size: 11.5px;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.um-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}

.um-item:hover {
  background: #f1f5f9;
}

.um-item.danger {
  color: #dc2626;
}

.um-item.danger:hover {
  background: #fef2f2;
}

.um-ico {
  width: 18px;
  text-align: center;
  opacity: .8;
}

.um-split {
  height: 1px;
  margin: 6px 4px;
  background: var(--border);
}

.um-fade-enter-active,
.um-fade-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}

.um-fade-enter-from,
.um-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
