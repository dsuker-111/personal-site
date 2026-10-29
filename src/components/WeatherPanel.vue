<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadWeather, savedCity, saveCity, HOT_CITIES, DEFAULT_CITY } from '../api/weather'
import { loadProfile, preferredCity } from '../store/profile'

// 个人信息里显式设过「默认城市」就以它为准，否则沿用上次查看的城市
loadProfile()

const weather = ref(null)
const loading = ref(false)
const error = ref('')
const initialCity = preferredCity() || savedCity() || DEFAULT_CITY
const input = ref(initialCity)
const city = ref(initialCity)

const today = computed(() => {
  const d = new Date()
  const w = '日一二三四五六'[d.getDay()]
  const mm = d.getMonth() + 1
  const dd = d.getDate()
  return `${d.getFullYear()} 年 ${mm} 月 ${dd} 日 · 周${w}`
})

const updatedText = computed(() => {
  if (!weather.value) return ''
  const d = new Date(weather.value.updatedAt)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `更新于 ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const sourceText = computed(() => {
  if (!weather.value) return ''
  return weather.value.source === 'backend' ? '后端缓存' : 'Open-Meteo 直连'
})

const activeCity = computed(() => (weather.value ? weather.value.city : city.value))

function dayLabel(dateStr, i) {
  if (i === 0) return '今天'
  if (i === 1) return '明天'
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return '周' + '日一二三四五六'[d.getDay()]
}

function mmdd(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : dateStr
}

async function fetchCity(name) {
  const target = (name || '').trim()
  if (!target || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await loadWeather(target)
    weather.value = data
    city.value = data.city
    saveCity(data.city)
    input.value = data.city
  } catch (err) {
    error.value = err && err.message ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

function search() {
  if (input.value.trim() !== activeCity.value) fetchCity(input.value)
}

function pick(name) {
  if (name === activeCity.value) return
  input.value = name
  fetchCity(name)
}

function refresh() {
  fetchCity(activeCity.value)
}

onMounted(() => fetchCity(city.value))
</script>

<template>
  <section class="weather-card">
    <div class="wx-top">
      <div class="wx-city">
        <span>{{ activeCity }}</span>
        <span v-if="weather && weather.region" class="wx-region">{{ weather.region }}</span>
      </div>

      <div class="wx-search">
        <input
          v-model="input"
          class="wx-input"
          type="text"
          placeholder="输入城市，如 上海"
          @keydown.enter.prevent="search"
        />
        <button class="wx-btn" :disabled="loading" @click="search">
          {{ loading ? '查询中…' : '查询' }}
        </button>
        <button class="wx-btn ghost" :disabled="loading" title="刷新" @click="refresh">↻</button>
      </div>
    </div>

    <p v-if="error" class="wx-error">{{ error }}</p>

    <div v-if="loading && !weather" class="wx-loading">正在获取天气…</div>

    <template v-if="weather">
      <div class="wx-now">
        <div class="wx-icon">{{ weather.current.icon }}</div>
        <div class="wx-now-main">
          <div class="wx-temp">
            {{ weather.current.temp }}<small>°C</small>
          </div>
          <div class="wx-desc">{{ weather.current.text }} · 体感 {{ weather.current.feels }}°C</div>
        </div>
        <div class="wx-metrics">
          <div class="wx-metric">湿度 <b>{{ weather.current.humidity }}%</b></div>
          <div class="wx-metric">风速 <b>{{ weather.current.wind }} km/h</b></div>
        </div>
      </div>

      <div class="wx-days">
        <div v-for="(d, i) in weather.daily" :key="d.date" class="wx-day">
          <div class="d">{{ dayLabel(d.date, i) }} <span class="wx-md">{{ mmdd(d.date) }}</span></div>
          <div class="i">{{ d.icon }}</div>
          <div class="t">{{ d.max }}° <em>/ {{ d.min }}°</em></div>
          <div class="r">{{ d.rain === null ? '—' : d.rain + '% 降水' }}</div>
        </div>
      </div>

      <div class="wx-chips">
        <button
          v-for="c in HOT_CITIES"
          :key="c"
          class="wx-chip"
          :class="{ active: c === activeCity }"
          @click="pick(c)"
        >{{ c }}</button>
      </div>

      <div class="wx-foot">
        <span>{{ updatedText }} · {{ sourceText }} · 数据：Open-Meteo</span>
        <span v-if="loading" class="wx-refreshing">刷新中…</span>
      </div>
    </template>

    <div class="wx-lesson">
      <span class="wx-lesson-tag">{{ today }}</span>
      <span>今天也要好好写代码 ☕</span>
    </div>
  </section>
</template>