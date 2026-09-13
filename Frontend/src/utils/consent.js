const STORAGE_KEY = 'nolio_consent'
const OPEN_EVENT = 'nolio-consent-open'

export function getConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.analytics !== 'boolean' || typeof parsed?.ads !== 'boolean') return null
    return parsed
  } catch {
    return null
  }
}

export function hasAnalyticsConsent() {
  return Boolean(getConsent()?.analytics)
}

export function hasAdsConsent() {
  return Boolean(getConsent()?.ads)
}

export function setConsent({ analytics, ads }) {
  const next = {
    analytics: Boolean(analytics),
    ads: Boolean(ads),
    decidedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('nolio-consent-changed', { detail: next }))
  return next
}

export function acceptAllConsent() {
  return setConsent({ analytics: true, ads: true })
}

export function refuseOptionalConsent() {
  return setConsent({ analytics: false, ads: false })
}

export function openConsentPreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function onConsentChange(handler) {
  const listener = (event) => handler(event.detail || getConsent())
  window.addEventListener('nolio-consent-changed', listener)
  return () => window.removeEventListener('nolio-consent-changed', listener)
}

export function onConsentOpen(handler) {
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
