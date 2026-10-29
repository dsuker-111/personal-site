// 模型清单：云端（阿里云百炼，经后端）+ 本地（TRAE 训练的 Qwen2.5-0.5B + lora_qa）
import { request, HAS_BACKEND } from './http'

export const LOCAL_ID = 'local:qwen-lora'

export const LOCAL_META = {
  id: LOCAL_ID,
  label: 'Qwen2.5-0.5B + LoRA',
  provider: 'TRAE 训练 · 本机',
  desc: '自训练模型，仅运行了本地服务的电脑可用',
  kind: 'local'
}

export function localBase() {
  const raw = (typeof window !== 'undefined' && window.__LOCAL_MODEL__) || ''
  return String(raw).replace(/\/+$/, '')
}

export async function listCloudModels() {
  if (!HAS_BACKEND) return []
  try {
    const d = await request('/api/models')
    return (d.models || []).map((m) => ({ ...m, kind: 'cloud' }))
  } catch {
    return []
  }
}

// 探测本机模型服务是否在运行（server/web_api.py）
export async function probeLocal(timeout = 3000) {
  const base = localBase()
  if (!base) return { online: false, reason: '未配置本地模型地址' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(base + '/health', { signal: ctrl.signal })
    if (!res.ok) return { online: false, reason: 'HTTP ' + res.status }
    const d = await res.json().catch(() => ({}))
    return { online: true, model: d.model || '', lora: !!d.lora }
  } catch (e) {
    const timeoutHit = e && e.name === 'AbortError'
    return { online: false, reason: timeoutHit ? '连接超时' : '未启动' }
  } finally {
    clearTimeout(timer)
  }
}