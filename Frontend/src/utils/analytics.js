const API = import.meta.env.VITE_API_URL || ''

const SESSION_KEY = 'nolio_analytics_sid'
const LAST_PATH_KEY = 'nolio_analytics_last_path'

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

function utmParams() {
  try {
    const params = new URLSearchParams(window.location.search)
    return {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
    }
  } catch {
    return { source: '', medium: '', campaign: '' }
  }
}

/** Pages marketing Nolyo (pas dashboard / admin). */
export function shouldTrackPath(pathname) {
  if (!pathname) return false
  if (pathname.startsWith('/dashboard')) return false
  if (pathname.startsWith('/president')) return false
  if (pathname.startsWith('/onboarding')) return false
  if (pathname.startsWith('/facture')) return false
  return true
}

export async function trackPageView(pathname = window.location.pathname) {
  if (typeof window === 'undefined') return
  if (!shouldTrackPath(pathname)) return

  try {
    const last = sessionStorage.getItem(LAST_PATH_KEY)
    const key = `${pathname}${window.location.search}`
    if (last === key) return
    sessionStorage.setItem(LAST_PATH_KEY, key)
  } catch {
    /* ignore */
  }

  const utm = utmParams()
  const body = {
    type: 'page_view',
    path: pathname || '/',
    referrer: document.referrer || '',
    sessionId: sessionId(),
    ...utm,
  }

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
      navigator.sendBeacon(`${API}/api/public/track`, blob)
      return
    }
  } catch {
    /* fallback below */
  }

  try {
    await fetch(`${API}/api/public/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch {
    /* ignore */
  }
}

export function getAnalyticsSessionId() {
  return sessionId()
}

/** Charge Google Analytics 4 si VITE_GA_MEASUREMENT_ID est défini. */
export function initGoogleAnalytics() {
  const id = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim()
  if (!id || typeof window === 'undefined') return null
  if (window.gtag) return id

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', id, { anonymize_ip: true })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
  return id
}

export function gaEvent(name, params = {}) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', name, params)
}
