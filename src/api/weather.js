// 天气数据
// 优先走后端 /api/weather（服务端带 10 分钟缓存、走国内网络更稳），
// 后端不可用时自动降级为浏览器直连 Open-Meteo（免费、无需 Key、支持 CORS），
// 因此即使函数计算停服，天气页面依然可用。

import { API_BASE, request } from './http'

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

const CITY_KEY = 'ps_weather_city'

export const DEFAULT_CITY = '杭州'

export const HOT_CITIES = ['杭州', '北京', '上海', '广州', '深圳', '成都', '武汉', '南京', '西安', '重庆']

// WMO 天气代码 → 中文描述 + 图标
const WMO = {
  0: ['晴', '☀️'],
  1: ['大部晴朗', '🌤'],
  2: ['多云', '⛅'],
  3: ['阴', '☁️'],
  45: ['雾', '🌫'],
  48: ['霜雾', '🌫'],
  51: ['小毛毛雨', '🌦'],
  53: ['毛毛雨', '🌦'],
  55: ['大毛毛雨', '🌧'],
  56: ['冻毛毛雨', '🌧'],
  57: ['强冻毛毛雨', '🌧'],
  61: ['小雨', '🌦'],
  63: ['中雨', '🌧'],
  65: ['大雨', '🌧'],
  66: ['冻雨', '🌧'],
  67: ['强冻雨', '🌧'],
  71: ['小雪', '🌨'],
  73: ['中雪', '🌨'],
  75: ['大雪', '❄️'],
  77: ['雪粒', '🌨'],
  80: ['小阵雨', '🌦'],
  81: ['阵雨', '🌧'],
  82: ['强阵雨', '⛈'],
  85: ['小阵雪', '🌨'],
  86: ['强阵雪', '❄️'],
  95: ['雷阵雨', '⛈'],
  96: ['雷阵雨伴冰雹', '⛈'],
  99: ['强雷暴伴冰雹', '⛈']
}

export function wmo(code) {
  const hit = WMO[Number(code)]
  return hit ? { text: hit[0], icon: hit[1] } : { text: '未知', icon: '🌡' }
}

export function savedCity() {
  try {
    return localStorage.getItem(CITY_KEY) || ''
  } catch {
    return ''
  }
}

export function saveCity(city) {
  try {
    localStorage.setItem(CITY_KEY, city || '')
  } catch {
    /* ignore */
  }
}

async function fetchJson(url, timeout = 9000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('天气服务响应超时')
    if (err instanceof TypeError) throw new Error('无法连接天气服务')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function geocode(city) {
  const u = new URL(GEO_URL)
  u.searchParams.set('name', city)
  u.searchParams.set('count', '1')
  u.searchParams.set('language', 'zh')
  u.searchParams.set('format', 'json')

  const data = await fetchJson(u.toString())
  const hit = data && data.results && data.results[0]
  if (!hit) throw new Error('没有找到城市「' + city + '」，换个名字试试')

  return {
    city: hit.name || city,
    region: [hit.admin1, hit.country].filter((x) => x && x !== hit.name).join(' · '),
    lat: hit.latitude,
    lon: hit.longitude
  }
}

async function forecastAt(lat, lon) {
  const u = new URL(FORECAST_URL)
  u.searchParams.set('latitude', lat)
  u.searchParams.set('longitude', lon)
  u.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m')
  u.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max')
  u.searchParams.set('timezone', 'auto')
  u.searchParams.set('forecast_days', '5')
  return fetchJson(u.toString())
}

// 后端返回秒级时间戳，直连返回 ISO 字符串 —— 统一成 ISO
function toISO(v) {
  if (!v) return new Date().toISOString()
  if (typeof v === 'number') {
    const ms = v < 1e12 ? v * 1000 : v
    return new Date(ms).toISOString()
  }
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

// 把三种来源（后端 / 直连）统一成 { city, region, lat, lon, current, daily, source, updatedAt }
function normalize(raw) {
  const c = raw.current || {}
  const days = raw.daily || []
  const curCode = c.code !== undefined ? c.code : c.weather_code

  return {
    city: raw.city || '未知城市',
    region: raw.region || '',
    lat: raw.lat,
    lon: raw.lon,
    current: {
      temp: num(c.temp),
      feels: num(c.feels),
      humidity: num(c.humidity),
      wind: num(c.wind),
      code: curCode,
      text: c.text || wmo(curCode).text,
      icon: c.icon || wmo(curCode).icon,
      time: c.time || ''
    },
    daily: days.slice(0, 5).map((d) => ({
      date: d.date,
      max: num(d.max),
      min: num(d.min),
      rain: d.rain === undefined || d.rain === null ? null : num(d.rain),
      code: d.code,
      text: d.text || wmo(d.code).text,
      icon: d.icon || wmo(d.code).icon
    })),
    source: raw.source || 'open-meteo',
    updatedAt: toISO(raw.updatedAt)
  }
}

async function directWeather(city) {
  const g = await geocode(city)
  const f = await forecastAt(g.lat, g.lon)
  const c = f.current || {}
  const d = f.daily || {}

  const dates = d.time || []
  const daily = dates.map((date, i) => {
    const code = (d.weather_code || [])[i]
    const m = wmo(code)
    return {
      date,
      max: Math.round((d.temperature_2m_max || [])[i]),
      min: Math.round((d.temperature_2m_min || [])[i]),
      rain: (d.precipitation_probability_max || [])[i] ?? null,
      code,
      text: m.text,
      icon: m.icon
    }
  })

  const code = c.weather_code
  const cm = wmo(code)

  return normalize({
    city: g.city,
    region: g.region,
    lat: g.lat,
    lon: g.lon,
    source: 'open-meteo',
    current: {
      temp: Math.round(c.temperature_2m),
      feels: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      wind: Math.round(c.wind_speed_10m),
      code,
      text: cm.text,
      icon: cm.icon,
      time: c.time || ''
    },
    daily
  })
}

/**
 * 查询天气。先试后端，失败则直连 Open-Meteo。
 * @param {string} city 城市名，留空则用上次查询 / 默认城市
 * @returns {Promise<object>} 统一后的天气对象
 */
export async function loadWeather(city) {
  const name = (city || '').trim() || savedCity() || DEFAULT_CITY
  const errors = []

  if (API_BASE) {
    try {
      const data = await request('/api/weather?city=' + encodeURIComponent(name), { timeout: 9000 })
      if (data && data.ok && data.current) {
        return normalize({ ...data, source: 'backend' })
      }
    } catch (err) {
      errors.push('后端：' + (err && err.message ? err.message : String(err)))
    }
  }

  try {
    return await directWeather(name)
  } catch (err) {
    const msg = err && err.message ? err.message : String(err)
    throw new Error(errors.length ? msg + '（' + errors[0] + '）' : msg)
  }
}