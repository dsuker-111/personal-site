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
import { auth } from '../store/auth'

const router = useRouter()

// 仅登录用户可编辑
const loggedIn = computed(() => auth.isLoggedIn())

const sites = computed(() => filledSites(profile))
const devices = computed(() => filledDevices(profile))
const skills = computed(() => profile.skills || [])
const experiences = computed(() =>
  (profile.experiences || []).filter((e) => (e.company || '').trim() || (e.role || '').trim())
)
const hasEdu = computed(() => Boolean(eduLine(profile)))
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
  <div class="showcase-grid">
    <!-- ① 主名片：头像 + 姓名 + 职位 + 签名 -->
    <section class="scard hero">
      <div class="hero-avatar">
        <img v-if="avatarShown.type === 'img'" :src="avatarShown.src" alt="头像" />
        <template v-else>{{ avatarShown.text }}</template>
      </div>
      <div class="hero-id">
        <div class="hero-name">
          <h1>{{ profile.nickname || '未命名' }}</h1>
          <button v-if="loggedIn" class="hero-edit" type="button" title="编辑个人信息" @click="edit">✎</button>
        </div>
        <p v-if="jobLine(profile)" class="hero-job">{{ jobLine(profile) }}</p>
        <p class="hero-bio">{{ profile.bio || '这个人很懒，什么都没写。' }}</p>
      </div>
    </section>

    <!-- ② 基本资料 -->
    <section class="scard info">
      <p class="scard-title"><span>🎓</span>基本资料</p>
      <ul class="info-list">
        <li v-if="hasEdu">
          <span class="ic">🎓</span>
          <span>{{ eduLine(profile) }}<em v-if="profile.eduPeriod"> · {{ profile.eduPeriod }}</em></span>
        </li>
        <li v-if="profile.location">
          <span class="ic">📍</span><span>{{ profile.location }}</span>
        </li>
        <li>
          <span class="ic">🏠</span><span>天气城市：{{ profile.city || '杭州' }}</span>
        </li>
        <li v-if="!hasEdu && !profile.location" class="empty">暂未填写</li>
      </ul>
    </section>

    <!-- ③ 技能 -->
    <section class="scard skills">
      <p class="scard-title"><span>⚡</span>技能标签</p>
      <div v-if="skills.length" class="skill-tags">
        <span v-for="s in skills" :key="s" class="skill-tag">{{ s }}</span>
      </div>
      <p v-else class="empty">暂未添加技能</p>
    </section>

    <!-- ④ 职业经历 -->
    <section class="scard exp">
      <p class="scard-title"><span>🕒</span>职业经历</p>
      <div v-if="experiences.length" class="exp-list">
        <div v-for="(e, i) in experiences" :key="'exp' + i" class="exp-item">
          <span class="dot"></span>
          <div>
            <strong>{{ e.role || e.company }}</strong>
            <div class="exp-sub">{{ [e.company, e.period].filter(Boolean).join(' · ') }}</div>
            <p v-if="e.desc" class="exp-desc">{{ e.desc }}</p>
          </div>
        </div>
      </div>
      <p v-else class="empty">暂未填写职业经历</p>
    </section>

    <!-- ⑤ 联系方式 -->
    <section class="scard contact">
      <p class="scard-title"><span>📮</span>联系方式</p>
      <ul v-if="profile.email || profile.github || profile.website" class="contact-list">
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
      <p v-else class="empty">暂未填写联系方式</p>
    </section>

    <!-- ⑥ 网站收藏 -->
    <section class="scard sites">
      <p class="scard-title"><span>🔖</span>网站收藏</p>
      <ul v-if="sites.length" class="item-list">
        <li v-for="(s, i) in sites" :key="'s' + i">
          <a :href="linkOf(s.url)" target="_blank" rel="noreferrer">
            <span class="ic-box">{{ s.icon || '🔗' }}</span>
            <span class="li-body">
              <strong>{{ s.name || hostOf(s.url) }}</strong>
              <em>{{ hostOf(s.url) }}</em>
              <small v-if="s.desc">{{ s.desc }}</small>
            </span>
          </a>
        </li>
      </ul>
      <p v-else class="empty">暂无收藏</p>
    </section>

    <!-- ⑦ 我的设备 -->
    <section class="scard devices">
      <p class="scard-title"><span>🖥️</span>我的设备</p>
      <ul v-if="devices.length" class="item-list">
        <li v-for="(x, i) in devices" :key="'d' + i">
          <span class="ic-box">{{ x.icon || '💻' }}</span>
          <span class="li-body">
            <strong>{{ x.name }}</strong>
            <em v-if="x.spec">{{ x.spec }}</em>
            <small v-if="x.note">{{ x.note }}</small>
          </span>
        </li>
      </ul>
      <p v-else class="empty">暂无设备</p>
    </section>
  </div>
</template>

<style scoped>
.showcase-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
  width: 100%;
}

.scard {
  position: relative;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.55);
  background-image: linear-gradient(135deg, var(--tint-a), var(--tint-b));
  backdrop-filter: blur(16px) saturate(1.08);
  -webkit-backdrop-filter: blur(16px) saturate(1.08);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  padding: 20px 22px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15), 0 2px 6px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 168px;
  min-width: 0;
}

/* 顶部彩色细条 */
.scard::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--accent);
  opacity: .55;
  pointer-events: none;
}

/* 右下角柔光斑 */
.scard::after {
  content: '';
  position: absolute;
  right: -46px;
  bottom: -58px;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: var(--accent);
  opacity: .13;
  filter: blur(26px);
  pointer-events: none;
}

/* 内容压在装饰层之上 */
.scard > * {
  position: relative;
  z-index: 1;
}

/* 每张卡片的配色（淡彩 + 半透明，让背景照片透出来） */
.hero {
  --tint-a: rgba(224, 231, 255, 0.52);
  --tint-b: rgba(237, 233, 254, 0.62);
  --accent: #6366f1;
  --tint-line: rgba(199, 210, 254, 0.9);
}

.info {
  --tint-a: rgba(236, 254, 255, 0.5);
  --tint-b: rgba(240, 253, 250, 0.6);
  --accent: #06b6d4;
  --tint-line: rgba(165, 243, 252, 0.9);
}

.skills {
  --tint-a: rgba(254, 252, 232, 0.54);
  --tint-b: rgba(253, 236, 200, 0.64);
  --accent: #f59e0b;
  --tint-line: rgba(245, 214, 138, 0.9);
}

.exp {
  --tint-a: rgba(239, 246, 255, 0.52);
  --tint-b: rgba(219, 234, 254, 0.62);
  --accent: #3b82f6;
  --tint-line: rgba(183, 211, 251, 0.9);
}

.contact {
  --tint-a: rgba(253, 242, 248, 0.52);
  --tint-b: rgba(252, 231, 243, 0.62);
  --accent: #ec4899;
  --tint-line: rgba(251, 207, 232, 0.9);
}

.sites {
  --tint-a: rgba(240, 253, 244, 0.5);
  --tint-b: rgba(209, 250, 229, 0.6);
  --accent: #22c55e;
  --tint-line: rgba(167, 240, 196, 0.9);
}

.devices {
  --tint-a: rgba(255, 247, 237, 0.54);
  --tint-b: rgba(255, 228, 204, 0.64);
  --accent: #f97316;
  --tint-line: rgba(251, 207, 165, 0.9);
}

.hero { grid-column: span 2; }
.exp { grid-column: span 2; }

/* 主名片 */
.hero {
  flex-direction: row;
  gap: 20px;
  align-items: center;
}

.hero-avatar {
  width: 92px;
  height: 92px;
  flex: none;
  border-radius: 26px;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 44px;
  background: #eef2ff;
  color: var(--primary);
}

.hero-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-id { min-width: 0; }

.hero-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-name h1 {
  font-size: 26px;
  line-height: 1.2;
  word-break: break-all;
}

.hero-edit {
  border: none;
  background: transparent;
  color: var(--primary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: .7;
}

.hero-edit:hover { opacity: 1; }

.hero-job {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.hero-bio {
  margin-top: 8px;
  font-size: 13.5px;
  color: var(--text-soft);
  line-height: 1.7;
}

/* 通用卡片标题 */
.scard-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
}

/* 基本资料 */
.info-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.55;
  word-break: break-all;
}

.info-list em {
  font-style: normal;
  opacity: .8;
}

.info-list .ic { flex: none; }

/* 空状态 */
.empty {
  font-size: 13px;
  color: #59667a;
  align-self: flex-start;
}

/* 技能 */
.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  padding: 4px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--primary);
  font-size: 12.5px;
}

/* 职业经历 */
.exp-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exp-item {
  display: flex;
  gap: 10px;
}

.exp-item .dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--primary);
  flex: none;
}

.exp-item strong {
  font-size: 13.5px;
  color: var(--text);
}

.exp-sub {
  font-size: 12px;
  color: var(--text-soft);
  margin-top: 1px;
}

.exp-desc {
  font-size: 12.5px;
  color: var(--text-soft);
  line-height: 1.6;
  margin-top: 3px;
}

/* 联系方式 */
.contact-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.contact-list li {
  font-size: 12.5px;
  word-break: break-all;
}

.contact-list a {
  color: var(--primary);
  text-decoration: none;
}

.contact-list a:hover { text-decoration: underline; }

/* 收藏 / 设备列表 */
.item-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-list li a {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 6px 8px;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: background .18s;
}

.item-list li a:hover { background: #f5f7fb; }

.ic-box {
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #eef2ff;
  font-size: 14px;
}

.li-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.li-body strong {
  font-size: 12.5px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.li-body em {
  font-style: normal;
  font-size: 11px;
  color: var(--primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.li-body small {
  font-size: 11px;
  color: var(--text-soft);
  line-height: 1.45;
}

/* 响应式 */
@media (max-width: 980px) {
  .showcase-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .hero { grid-column: span 2; }
  .exp { grid-column: span 2; }
}

@media (max-width: 640px) {
  .showcase-grid {
    grid-template-columns: 1fr;
  }
  .hero { grid-column: span 1; flex-direction: column; align-items: flex-start; }
  .exp { grid-column: span 1; }
}
</style>
