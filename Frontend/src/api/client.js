export async function api(path, options = {}) {
  const token = options.token ?? localStorage.getItem('nolio_token')
  const headers = { ...(options.headers || {}) }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.error || 'Une erreur est survenue.')
    error.status = res.status
    error.code = data.code
    throw error
  }

  return data
}
