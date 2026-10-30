// 资源库接口 · 走 Supabase Storage（免费 1GB，不依赖阿里云 FC3）
import { supabase } from './supabase'

const BUCKET = 'library'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

const KIND_MAP = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image', ico: 'image',
  mp4: 'video', webm: 'video', mov: 'video', avi: 'video', mkv: 'video'
}

function kindOf(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  return KIND_MAP[ext] || 'file'
}

/** 列出所有文件（仅登录用户的文件） */
export async function listFiles() {
  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 500,
    sortBy: { column: 'created_at', order: 'desc' }
  })
  if (error) throw new Error('读取文件列表失败：' + error.message)

  return (data || [])
    .filter((f) => f.name !== '.emptyFolderPlaceholder')
    .map((f) => {
      const url = getPublicUrl(f.name)
      return {
        name: f.name,
        path: f.name,
        size: f.metadata?.size || 0,
        kind: kindOf(f.name),
        updatedAt: f.updated_at || f.created_at,
        url
      }
    })
}

/** 生成 Supabase Storage 安全 key：只保留 ASCII 字母数字和 -_. */
function safeKey(filename) {
  const dot = filename.lastIndexOf('.')
  const name = dot >= 0 ? filename.slice(0, dot) : filename
  const ext = dot >= 0 ? filename.slice(dot) : ''
  // 去除非 ASCII 和特殊字符，长度兜底
  let safe = name.replace(/[^a-zA-Z0-9._-]/g, '').replace(/\.{2,}/g, '.')
  if (!safe || safe.length < 1) safe = 'file_' + Date.now().toString(36)
  if (safe.length > 80) safe = safe.slice(0, 80)
  return safe + ext
}

/** 上传文件 */
export async function uploadFile(file, onProgress) {
  if (file.size > MAX_FILE_SIZE) throw new Error('文件超过 20MB，无法上传')
  if (onProgress) onProgress(30)

  const key = safeKey(file.name)
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    })

  if (error) throw new Error('上传失败：' + error.message)
  // 把原始中文名存为自定义元数据
  const origName = file.name
  if (origName !== key) {
    try { await supabase.storage.from(BUCKET).updateMetadata(data.path, { original_name: origName }) } catch {}
  }
  if (onProgress) onProgress(100)

  return {
    path: data.path,
    key,
    name: file.name,   // 界面上仍显示中文原名
    size: file.size,
    kind: kindOf(file.name),
    url: getPublicUrl(data.path)
  }
}

/** 删除文件 */
export async function deleteFile(filepath) {
  const { error } = await supabase.storage.from(BUCKET).remove([filepath])
  if (error) throw new Error('删除失败：' + error.message)
}

/** 公开访问 URL */
export function getPublicUrl(filepath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filepath)
  return data.publicUrl
}

/** 下载文件（浏览器触发下载） */
export async function downloadFileResource(f) {
  const res = await fetch(f.url)
  if (!res.ok) throw new Error('下载失败')
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = f.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

export function formatSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(2) + ' MB'
}