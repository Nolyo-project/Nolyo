const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** Préfixe l’URL API en prod (Vercel → Railway). En local : chemin relatif (proxy Vite). */
export function apiUrl(path = '') {
  if (!path) return API_BASE || ''
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return API_BASE ? `${API_BASE}${normalized}` : normalized
}

/** Images /uploads hébergées sur le backend Railway. */
export function mediaUrl(url = '') {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url
  return apiUrl(url)
}

function fail(data, res) {
  const error = new Error(data.error || 'Une erreur est survenue.')
  error.status = res.status
  error.code = data.code
  if (data.code === 'BILLING_LOCK' && typeof window !== 'undefined' && !window.location.pathname.startsWith('/facture')) {
    window.location.assign('/facture')
  }
  throw error
}

export async function api(path, options = {}) {
  const token = options.token ?? localStorage.getItem('nolio_token')
  const headers = { ...(options.headers || {}) }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(apiUrl(path), {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) fail(data, res)

  return data
}

export async function apiUpload(path, formData, options = {}) {
  const token = options.token ?? localStorage.getItem('nolio_token')
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(apiUrl(path), {
    method: options.method || 'POST',
    headers,
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) fail(data, res)
  return data
}

export async function apiDownload(path, fileName, options = {}) {
  const token = options.token ?? localStorage.getItem('nolio_token')
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(apiUrl(path), { method: options.method || 'GET', headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    fail(data, res)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
  const resolvedName = decodeURIComponent(match?.[1] || match?.[2] || fileName || 'facture.pdf')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = resolvedName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return { fileName: resolvedName }
}
