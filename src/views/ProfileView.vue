<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  loadProfile,
  saveProfile,
  profile,
  cloneProfile,
  AVATARS,
  DEGREES
} from '../store/profile'
import { HOT_CITIES } from '../api/weather'

const router = useRouter()
const toast = ref('')
const error = ref('')
const skillInput = ref('')

// 草稿：取消时不影响正式数据
const draft = ref(cloneProfile(profile))

onMounted(() => {
  loadProfile()
  draft.value = cloneProfile(profile)
})

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(profile))
const canSave = computed(() => draft.value.nickname.trim().length > 0)

const eduLine = computed(() =>
  [draft.value.school, draft.value.major, draft.value.degree].filter(Boolean).join(' · ')
)
const jobLine = computed(() => {
  const d = draft.value
  if (d.title && d.company) return d.title + ' · ' + d.company
  return d.title || d.company || ''
})
const filledExperiences = computed(() =>
  (draft.value.experiences || []).filter((e) => (e.company || '').trim() || (e.role || '').trim())
)

function pickAvatar(a) {
  draft.value.avatar = a
}

function addExperience() {
  draft.value.experiences.push({ company: '', role: '', period: '', desc: '' })
}

function removeExperience(i) {
  draft.value.experiences.splice(i, 1)
}

function addSkill() {
  const s = skillInput.value.trim()
  if (!s) return
  if (!draft.value.skills.includes(s)) draft.value.skills.push(s)
  skillInput.value = ''
}

function removeSkill(i) {
  draft.value.skills.splice(i, 1)
}

function reset() {
  draft.value = cloneProfile(profile)
  skillInput.value = ''
  error.value = ''
}

function save() {
  const nickname = draft.value.nickname.trim()
  if (!nickname) {
    error.value = '昵称不能为空'
    return
  }
  const email = draft.value.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error.value = '邮箱格式好像不对'
    return
  }
  error.value = ''

  const d = draft.value
  saveProfile({
    nickname,
    avatar: d.avatar || '🙂',
    bio: d.bio.trim(),
    title: d.title.trim(),
    company: d.company.trim(),
    location: d.location.trim(),
    school: d.school.trim(),
    major: d.major.trim(),
    degree: d.degree,
    eduPeriod: d.eduPeriod.trim(),
    skills: d.skills.filter((s) => s.trim()),
    experiences: (d.experiences || [])
      .map((e) => ({
        company: e.company.trim(),
        role: e.role.trim(),
        period: e.period.trim(),
        desc: e.desc.trim()
      }))
      .filter((e) => e.company || e.role),
    email,
    github: d.github.trim(),
    website: d.website.trim(),
    city: d.city.trim() || '杭州'
  })

  toast.value = '已保存，正在返回主页…'
  setTimeout(() => router.push('/'), 700)
}

function cancel() {
  router.push('/')
}

function linkOf(v) {
  if (!v) return ''
  return /^https?:\/\//i.test(v) ? v : 'https://' + v
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
      <div class="pf-layout">
        <!-- 名片预览 -->
        <aside class="pf-preview">
          <div class="pf-avatar">{{ draft.avatar || '🙂' }}</div>
          <h2>{{ draft.nickname || '未命名' }}</h2>
          <p v-if="jobLine" class="pf-job">{{ jobLine }}</p>
          <p class="pf-bio">{{ draft.bio || '这个人很懒，什么都没写。' }}</p>

          <ul class="pf-meta">
            <li v-if="eduLine">
              <span class="ic">🎓</span>
              <span>{{ eduLine }}<em v-if="draft.eduPeriod"> · {{ draft.eduPeriod }}</em></span>
            </li>
            <li v-if="draft.location">
              <span class="ic">📍</span><span>{{ draft.location }}</span>
            </li>
            <li>
              <span class="ic">☁️</span><span>默认天气城市：{{ draft.city || '杭州' }}</span>
            </li>
          </ul>

          <div v-if="draft.skills.length" class="pf-skills">
            <span v-for="(s, i) in draft.skills" :key="s" class="pf-skill">
              {{ s }}
              <button type="button" title="删除" @click="removeSkill(i)">×</button>
            </span>
          </div>

          <div v-if="filledExperiences.length" class="pf-timeline">
            <p class="pf-timeline-title">职业经历</p>
            <div v-for="(e, i) in filledExperiences" :key="i" class="pf-tl-item">
              <span class="dot"></span>
              <div>
                <strong>{{ e.role || e.company }}</strong>
                <div class="pf-tl-sub">
                  {{ [e.company, e.period].filter(Boolean).join(' · ') }}
                </div>
                <p v-if="e.desc" class="pf-tl-desc">{{ e.desc }}</p>
              </div>
            </div>
          </div>

          <ul v-if="draft.email || draft.github || draft.website" class="pf-links">
            <li v-if="draft.email">
              <a :href="'mailto:' + draft.email">✉️ {{ draft.email }}</a>
            </li>
            <li v-if="draft.github">
              <a :href="linkOf(draft.github)" target="_blank" rel="noreferrer">🐙 {{ draft.github }}</a>
            </li>
            <li v-if="draft.website">
              <a :href="linkOf(draft.website)" target="_blank" rel="noreferrer">🔗 {{ draft.website }}</a>
            </li>
          </ul>
        </aside>

        <!-- 表单 -->
        <section class="pf-form-wrap">
          <form class="pf-form" @submit.prevent="save">
            <h3 class="pf-section">基本信息</h3>

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

            <div class="pf-row">
              <label class="pf-field">
                <span class="pf-label">昵称</span>
                <input v-model="draft.nickname" type="text" maxlength="12" placeholder="最多 12 个字" />
              </label>
              <label class="pf-field">
                <span class="pf-label">所在地</span>
                <input v-model="draft.location" type="text" maxlength="20" placeholder="如 杭州" />
              </label>
            </div>

            <label class="pf-field">
              <span class="pf-label">个性签名</span>
              <textarea v-model="draft.bio" rows="2" maxlength="40" placeholder="一句话介绍自己（最多 40 字）"></textarea>
            </label>

            <h3 class="pf-section">教育与职业</h3>

            <div class="pf-row">
              <label class="pf-field">
                <span class="pf-label">毕业院校</span>
                <input v-model="draft.school" type="text" maxlength="30" placeholder="如 浙江大学" />
              </label>
              <label class="pf-field">
                <span class="pf-label">专业</span>
                <input v-model="draft.major" type="text" maxlength="30" placeholder="如 软件工程" />
              </label>
            </div>

            <div class="pf-row">
              <label class="pf-field">
                <span class="pf-label">学历</span>
                <select v-model="draft.degree">
                  <option v-for="d in DEGREES" :key="d" :value="d">{{ d }}</option>
                </select>
              </label>
              <label class="pf-field">
                <span class="pf-label">在校时间</span>
                <input v-model="draft.eduPeriod" type="text" maxlength="20" placeholder="如 2021 - 2025" />
              </label>
            </div>

            <div class="pf-row">
              <label class="pf-field">
                <span class="pf-label">当前公司</span>
                <input v-model="draft.company" type="text" maxlength="30" placeholder="如 某某科技" />
              </label>
              <label class="pf-field">
                <span class="pf-label">职位 / 头衔</span>
                <input v-model="draft.title" type="text" maxlength="30" placeholder="如 前端开发工程师" />
              </label>
            </div>

            <h3 class="pf-section">
              职业经历
              <button class="pf-add" type="button" @click="addExperience">＋ 添加一段</button>
            </h3>

            <p v-if="!draft.experiences.length" class="pf-empty">
              还没有经历，点右上「＋ 添加一段」记录实习 / 工作 / 项目。
            </p>

            <div v-for="(e, i) in draft.experiences" :key="i" class="pf-exp">
              <div class="pf-exp-head">
                <span>经历 {{ i + 1 }}</span>
                <button type="button" class="pf-del" @click="removeExperience(i)">删除</button>
              </div>
              <div class="pf-row">
                <label class="pf-field">
                  <span class="pf-label">公司 / 组织</span>
                  <input v-model="e.company" type="text" maxlength="30" placeholder="如 某某科技" />
                </label>
                <label class="pf-field">
                  <span class="pf-label">职位 / 角色</span>
                  <input v-model="e.role" type="text" maxlength="30" placeholder="如 前端实习生" />
                </label>
              </div>
              <label class="pf-field">
                <span class="pf-label">时间</span>
                <input v-model="e.period" type="text" maxlength="24" placeholder="如 2024.06 - 2024.09" />
              </label>
              <label class="pf-field">
                <span class="pf-label">做了什么</span>
                <textarea v-model="e.desc" rows="2" maxlength="80" placeholder="一句话说明主要工作（最多 80 字）"></textarea>
              </label>
            </div>

            <h3 class="pf-section">技能</h3>
            <div class="pf-skill-input">
              <input
                v-model="skillInput"
                type="text"
                maxlength="16"
                placeholder="输入技能后按 Enter，如 Vue 3"
                @keydown.enter.prevent="addSkill"
              />
              <button type="button" class="pf-btn" @click="addSkill">添加</button>
            </div>
            <div v-if="draft.skills.length" class="pf-chips">
              <span v-for="(s, i) in draft.skills" :key="s" class="pf-chip">
                {{ s }}
                <button type="button" @click="removeSkill(i)">×</button>
              </span>
            </div>
            <p v-else class="pf-empty">还没有技能标签</p>

            <h3 class="pf-section">联系方式</h3>
            <div class="pf-row">
              <label class="pf-field">
                <span class="pf-label">邮箱</span>
                <input v-model="draft.email" type="email" maxlength="60" placeholder="you@example.com" />
              </label>
              <label class="pf-field">
                <span class="pf-label">GitHub</span>
                <input v-model="draft.github" type="text" maxlength="60" placeholder="github.com/yourname" />
              </label>
            </div>
            <label class="pf-field">
              <span class="pf-label">个人网站</span>
              <input v-model="draft.website" type="text" maxlength="80" placeholder="https://…" />
            </label>

            <h3 class="pf-section">天气</h3>
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
              修改保存在本机浏览器，保存后立刻更新顶栏、主页问候语与默认天气城市。
            </p>
          </form>
        </section>
      </div>
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
  max-width: 1080px;
  margin: 0 auto;
  padding: 26px 20px 60px;
}

.pf-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 22px;
  align-items: start;
}

/* ---------- 名片预览 ---------- */
.pf-preview {
  position: sticky;
  top: 84px;
  background: #fff;
  border-radius: 16px;
  padding: 22px 20px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.1);
  text-align: center;
}

.pf-avatar {
  width: 82px;
  height: 82px;
  margin: 2px auto 12px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  font-size: 40px;
  background: #eef2ff;
}

.pf-preview h2 {
  font-size: 19px;
  word-break: break-all;
}

.pf-job {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--primary);
  font-weight: 600;
}

.pf-bio {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--text-soft);
  line-height: 1.6;
}

.pf-meta {
  list-style: none;
  margin: 14px 0 0;
  padding: 12px 0 0;
  border-top: 1px dashed var(--border);
  text-align: left;
}

.pf-meta li {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-soft);
  line-height: 1.6;
  margin-bottom: 6px;
  word-break: break-all;
}

.pf-meta em {
  font-style: normal;
  opacity: .8;
}

.pf-meta .ic {
  flex: none;
}

.pf-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-top: 12px;
}

.pf-skill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--primary);
  font-size: 11.5px;
}

.pf-skill button {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  opacity: .6;
  padding: 0;
}

.pf-skill button:hover {
  opacity: 1;
}

.pf-timeline {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  text-align: left;
}

.pf-timeline-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-soft);
  margin-bottom: 8px;
}

.pf-tl-item {
  display: flex;
  gap: 9px;
  margin-bottom: 10px;
}

.pf-tl-item .dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--primary);
  flex: none;
}

.pf-tl-item strong {
  font-size: 12.5px;
}

.pf-tl-sub {
  font-size: 11px;
  color: var(--text-soft);
}

.pf-tl-desc {
  font-size: 11.5px;
  color: var(--text-soft);
  line-height: 1.55;
  margin-top: 2px;
}

.pf-links {
  list-style: none;
  margin: 14px 0 0;
  padding: 12px 0 0;
  border-top: 1px dashed var(--border);
  text-align: left;
}

.pf-links li {
  font-size: 11.5px;
  margin-bottom: 5px;
  word-break: break-all;
}

.pf-links a {
  color: var(--primary);
  text-decoration: none;
}

.pf-links a:hover {
  text-decoration: underline;
}

/* ---------- 表单 ---------- */
.pf-form-wrap {
  background: #fff;
  border-radius: 16px;
  padding: 22px 24px 26px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.1);
}

.pf-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pf-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  padding-bottom: 8px;
  font-size: 13.5px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.pf-section:first-child {
  margin-top: 0;
}

.pf-add {
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--primary);
  font: inherit;
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
}

.pf-add:hover {
  background: #eef2ff;
  border-color: var(--primary);
}

.pf-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pf-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
}

.pf-field input,
.pf-field textarea,
.pf-field select {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  font: inherit;
  font-size: 13.5px;
  color: var(--text);
  background: #fff;
  outline: none;
  resize: vertical;
  transition: border-color .18s, box-shadow .18s;
}

.pf-field input:focus,
.pf-field textarea:focus,
.pf-field select:focus {
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

.pf-exp {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fbfcfe;
}

.pf-exp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
}

.pf-del {
  border: none;
  background: transparent;
  color: #dc2626;
  font-size: 12px;
  cursor: pointer;
}

.pf-del:hover {
  text-decoration: underline;
}

.pf-skill-input {
  display: flex;
  gap: 8px;
}

.pf-skill-input input {
  flex: 1;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  font: inherit;
  font-size: 13.5px;
  outline: none;
}

.pf-skill-input input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.pf-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.pf-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--primary);
  font-size: 12.5px;
}

.pf-chip button {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  opacity: .65;
  padding: 0;
}

.pf-chip button:hover {
  opacity: 1;
}

.pf-empty {
  font-size: 12px;
  color: var(--text-soft);
  background: #f8fafc;
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 10px 12px;
}

.pf-error {
  color: #dc2626;
  font-size: 13px;
}

.pf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.pf-btn {
  padding: 9px 17px;
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
  font-size: 11.5px;
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

@media (max-width: 900px) {
  .pf-layout {
    grid-template-columns: 1fr;
  }

  .pf-preview {
    position: static;
  }
}

@media (max-width: 620px) {
  .pf-row {
    grid-template-columns: 1fr;
  }

  .profile-main {
    padding: 18px 14px 50px;
  }

  .pf-form-wrap {
    padding: 18px 16px 22px;
  }

  .topbar {
    padding: 12px 16px;
  }
}
</style>