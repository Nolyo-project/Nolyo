const ADMIN_HOSTS = new Set(['admin.nolyo.fr', 'admin.localhost'])

export function isAdminHost(hostname = window.location.hostname) {
  return ADMIN_HOSTS.has(hostname) || hostname.startsWith('admin.')
}

export function siteOrigin() {
  const fromEnv = import.meta.env.VITE_SITE_ORIGIN
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  if (isAdminHost()) return 'https://nolyo.fr'
  return window.location.origin
}

export function adminOrigin() {
  const fromEnv = import.meta.env.VITE_ADMIN_ORIGIN
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  if (isAdminHost()) return window.location.origin
  return ''
}

export function founderHomePath() {
  return isAdminHost() ? '/' : '/president'
}

export function publicSiteHref(path = '/') {
  if (!isAdminHost()) return path
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}

export function adminHref(path = '/') {
  const origin = adminOrigin()
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (origin) return `${origin}${suffix === '/president' ? '/' : suffix}`
  return suffix === '/' ? '/president' : suffix
}
