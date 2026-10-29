<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AiChat from './AiChat.vue'

const open = ref(false)
const started = ref(false)

function toggle() {
  open.value = !open.value
  if (open.value) started.value = true
}

function close() {
  open.value = false
}

function onKey(e) {
  if (e.key === 'Escape' && open.value) close()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="chat-widget">
    <transition name="cw-fade">
      <section v-if="open" class="chat-window" role="dialog" aria-label="AI 对话助手">
        <header class="cw-head">
          <span class="cw-title"><i class="cw-dot"></i> AI 助手</span>
          <button class="cw-icon" title="收起（Esc）" @click="close">✕</button>
        </header>
        <div class="cw-body">
          <!-- 首次打开才挂载，避免页面加载时就探测模型 -->
          <AiChat v-if="started" />
        </div>
      </section>
    </transition>

    <button
      class="chat-fab"
      :class="{ active: open }"
      :title="open ? '收起 AI 助手' : '打开 AI 助手'"
      @click="toggle"
    >
      <template v-if="open">✕ 收起</template>
      <template v-else>💬 AI 助手</template>
    </button>
  </div>
</template>