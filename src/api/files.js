// 资源库接口
import { request, fileUrl } from './http'

export async function listFiles() {
  const d = await request('/api/files')
  return (d.files || []).map((f) => ({ ...f, url: fileUrl(f.path) }))
}

export async function uploadFile(file, onProgress) {
  const data = await readAsBase64(file)
  if (onProgress) onProgress(60)
  const d = await request('/api/upload', {
    method: 'POST',
    body: { name: file.name, contentType: file.type || 'application/octet-stream', data },
    timeout: 180000
  })
  if (onProgress) onProgress(100)
  return d.file
}

export async function deleteFile(path) {
  return request('/api/delete', { method: 'POST', body: { path } })
}

export async function downloadFile(f) {
  const res = await fetch(f.url)
  if (!res.ok) throw new Error('下载失败 HTTP ' + res.status)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = f.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = String(reader.result || '')
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

export function formatSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(2) + ' MB'
}