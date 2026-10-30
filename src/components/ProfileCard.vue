<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  profile,
  jobLine,
  eduLine,
  filledSites,
  filledDevices,
  hostOf
} from '../store/profile'

const router = useRouter()

// 只展示真正填了的内容（收藏 / 设备 / 技能 / 经历）
const sites = computed(() => filledSites(profile))
const devices = computed(() => filledDevices(profile))
const hasSites = computed(() => sites.value.length > 0)
const hasDevices = computed(() => devices.value.length > 0)
const hasSkills = computed(() => (profile.skills || []).length > 0)
const hasExperiences = computed(() =>
  (profile.experiences || []).some((e) => (e.company || '').trim() || (e.role || '').trim())
)
const hasContacts = computed(() =>
  Boolean(profile.email || profile.github || profile.website)
)

// 头像优先照片，否则 emoji
const avatarShown = computed(() =>
  profile.avatarUrl
    ? { type: 'img', src: profile.avatarUrl }
    : { type: 'emoji', text: profile.avatar || '🙂' }
)

function linkOf(v) {
  if (!v) return ''
  return /^https?:\/\//i.test(v) ? v : 'https://' + v
}

function edit() {
  router.push('/profile')
}
</script>

<template>
  <section class="pcard">
    <!-- 头部：头像 + 身份 -->
    <div class="pcard-head">
      <div class="pcard-avatar">
        <img v-if="avatarShown.type === 'img'" :src="avatarShown.src" alt="头像" />
        <template v-else>{{ avatarShown.text }}</template>
      </div>
      <div class="pcard-id">
        <div class="pcard-name">
          <h2>{{ profile.nickname || '未命名' }}</h2>
          <button class="pcard-edit" type="button" title="编辑个人信息" @click="edit">✎</button>
        </div>
        <p v-if="jobLine(profile)" class="pcard-job">{{ jobLine(profile) }}</p>
        <p class="pcard-bio">{{ profile.bio || '这个人很懒，什么都没写。' }}</p>
      </div>
    </div>

    <!-- 基本信息行 -->
    <ul class="pcard-meta">
      <li v-if="eduLine(profile)">
        <span class="ic">🎓</span>
        <span>{{ eduLine(profile) }}<em v-if="profile.eduPeriod"> · {{ profile.eduPeriod }}</em></span>
      </li>
      <li v-if="profile.location">
        <span class="ic">📍</span><span>{{ profile.location }}</span>
      </li>
      <li>
        <span class="ic">🏠</span><span>天气城市：{{ profile.city || '杭州' }}</span>
      </li>
    </ul>

    <!-- 技能 -->
    <div v-if="hasSkills" class="pcard-skills">
      <span v-for="s in profile.skills" :key="s" class="pcard-skill">{{ s }}</span>
    </div>

    <!-- 职业经历 -->
    <div
      v-if="hasExperiences"
      class="pcard-block"
    >
      <p class="pcard-title"><span>🕒</span>职业经历</p>
      <div
        v-for="(e, i) in profile.experiences.filter((x) => x.company || x.role)"
        :key="'exp' + i"
        class="pcard-exp"
      >
        <span class="dot"></span>
        <div>
          <strong>{{ e.role || e.company }}</strong>
          <div class="pcard-exp-sub">{{ [e.company, e.period].filter(Boolean).join(' · ') }}</div>
          <p v-if="e.desc" class="pcard-exp-desc">{{ e.desc }}</p>
        </div>
      </div>
    </div>

    <!-- 联系方式 -->
    <ul v-if="hasContacts" class="pcard-links">
      <li v-if="profile.email">
        <a :href="'mailto:' + profile.email">✉️ {{ profile.email }}</a>
      </li>
      <li v-if="profile.github">
        <a :href="linkOf(profile.github)" target="_blank" rel="noreferrer">🐙 {{ profile.github }}</a>
      </li>
      <li v-if="profile.website">
        <a :href="linkOf(profile.website)" target="_blank" rel="noreferrer">🔗 {{ profile.website }}</a>
      </li>
    </ul>

    <!-- 收藏 + 设备：两栏 -->
    <div v-if="hasSites || hasDevices" class="pcard-cols">
      <article v-if="hasSites" class="pcard-col">
        <p class="pcard-title"><span>🔖</span>网站收藏</p>
        <ul class="pcard-list">
          <li v-for="(s, i) in sites" :key="'s' + i">
            <a :href="linkOf(s.url)" target="_blank" rel="noreferrer">
              <span class="pcard-ic">{{ s.icon || '🔗' }}</span>
              <span class="pcard-li-body">
                <strong>{{ s.name || hostOf(s.url) }}</strong>
                <em>{{ hostOf(s.url) }}</em>
                <small v-if="s.desc">{{ s.desc }}</small>
              </span>
            </a>
          </li>
        </ul>
      </article>

      <article v-if="hasDevices" class="pcard-col">
        <p class="pcard-title"><span>🖥️</span>我的设备</p>
        <ul class="pcard-list">
          <li v-for="(x, i) in devices" :key="'d' + i">
            <span class="pcard-ic">{{ x.icon || '💻' }}</span>
            <span class="pcard-li-body">
              <strong>{{ x.name }}</strong>
              <em v-if="x.spec">{{ x.spec }}</em>
              <small v-if="x.note">{{ x.note }}</small>
            </span>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.pcard {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px 22px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  margin-bottom: 22px;
}

/* 头部 */
.pcard-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.pcard-avatar {
  width: 66px;
  height: 66px;
  flex: none;
  border-radius: 20px;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 32px;
  background: #eef2ff;
  color: var(--primary);
}

.pcard-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pcard-id {
  min-width: 0;
}

.pcard-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pcard-name h2 {
  font-size: 20px;
  word-break: break-all;
}

.pcard-edit {
  border: none;
  background: transparent;
  color: var(--primary);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  opacity: .7;
}

.pcard-edit:hover {
  opacity: 1;
}

.pcard-job {
  margin-top: 3px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--primary);
}

.pcard-bio {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--text-soft);
  line-height: 1.6;
}

/* 基本信息 */
.pcard-meta {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 16px 0 0;
  padding: 14px 0 0;
  border-top: 1px dashed var(--border);
}

.pcard-meta li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--text-soft);
  line-height: 1.55;
  word-break: break-all;
}

.pcard-meta em {
  font-style: normal;
  opacity: .8;
}

.pcard-meta .ic {
  flex: none;
}

/* 技能 */
.pcard-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.pcard-skill {
  padding: 3px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--primary);
  font-size: 12px;
}

/* 经历 / 收藏 / 设备通用的标题与卡片 */
.pcard-block {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
}

.pcard-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
}

.pcard-exp {
  display: flex;
  gap: 9px;
  margin-bottom: 10px;
}

.pcard-exp .dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--primary);
  flex: none;
}

.pcard-exp strong {
  font-size: 12.5px;
  color: var(--text);
}

.pcard-exp-sub {
  font-size: 11px;
  color: var(--text-soft);
}

.pcard-exp-desc {
  font-size: 11.5px;
  color: var(--text-soft);
  line-height: 1.55;
  margin-top: 2px;
}

/* 联系方式 */
.pcard-links {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 16px 0 0;
  padding: 14px 0 0;
  border-top: 1px dashed var(--border);
}

.pcard-links li {
  font-size: 12px;
  word-break: break-all;
}

.pcard-links a {
  color: var(--primary);
  text-decoration: none;
}

.pcard-links a:hover {
  text-decoration: underline;
}

/* 收藏 / 设备两栏 */
.pcard-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
}

.pcard-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pcard-list li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 7px 8px;
  border-radius: 10px;
}

.pcard-list li a {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: 100%;
  padding: 7px 8px;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: background .18s;
}

.pcard-list li a:hover {
  background: #f5f7fb;
}

.pcard-ic {
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #eef2ff;
  font-size: 14px;
}

.pcard-li-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.pcard-li-body strong {
  font-size: 12.5px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pcard-li-body em {
  font-style: normal;
  font-size: 11px;
  color: var(--primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pcard-li-body small {
  font-size: 11px;
  color: var(--text-soft);
  line-height: 1.45;
}

@media (max-width: 560px) {
  .pcard-cols {
    grid-template-columns: 1fr;
  }
}
</style>