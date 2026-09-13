import { apiUrl } from '../api/client'
import { hasAdsConsent, hasAnalyticsConsent } from './consent'

const SESSION_KEY = 'nolio_analytics_sid'
const LAST_PATH_KEY = 'nolio_analytics_last_path'
const ACQUISITION_KEY = 'nolio_acquisition'
const PRICING_KEY = 'nolio_view_pricing'

export const EVENTS = {
  PAGE_VIEW: 'page_view',
  VIEW_PRICING: 'view_pricing',
  GENERATE_LEAD: 'generate_lead',
  SIGN_UP: 'sign_up',
  TRIAL_START: 'trial_start',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  PREVIEW_START: 'preview_start',
  PURCHASE: 'purchase',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
}

const FIRST_PARTY_TYPES = new Set([EVENTS.PAGE_VIEW, EVENTS.VIEW_PRICING])
const BLOCKED_GA_KEYS = new Set(['email', 'name', 'phone', 'userId', 'user_id', 'gclid', 'gbraid', 'wbraid'])

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

function readSearchParams() {
  try {
    return new URLSearchParams(window.location.search)
  } catch {
    return new URLSearchParams()
  }
}

function firstTouch(current, incoming) {
  return current || incoming || ''
}

export function captureAcquisition() {
  if (typeof window === 'undefined') return getAcquisition()
  const params = readSearchParams()
  const incoming = {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    gclid: params.get('gclid') || '',
    gbraid: params.get('gbraid') || '',
    wbraid: params.get('wbraid') || '',
    landingPath: window.location.pathname || '/',
  }

  let stored = {}
  try {
    stored = JSON.parse(sessionStorage.getItem(ACQUISITION_KEY) || '{}') || {}
  } catch {
    stored = {}
  }

  const next = {
    source: firstTouch(stored.source, incoming.source),
    medium: firstTouch(stored.medium, incoming.medium),
    campaign: firstTouch(stored.campaign, incoming.campaign),
    gclid: firstTouch(stored.gclid, incoming.gclid),
    gbraid: firstTouch(stored.gbraid, incoming.gbraid),
    wbraid: firstTouch(stored.wbraid, incoming.wbraid),
    landingPath: stored.landingPath || incoming.landingPath || '/',
    sessionId: stored.sessionId || sessionId(),
  }

  try {
    sessionStorage.setItem(ACQUISITION_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function getAcquisition() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(ACQUISITION_KEY) || '{}') || {}
    if (stored.sessionId || stored.source || stored.gclid) return stored
  } catch {
    /* ignore */
  }
  return captureAcquisition()
}

export function acquisitionPayload() {
  const a = getAcquisition()
  return {
    source: a.source || '',
    medium: a.medium || '',
    campaign: a.campaign || '',
    gclid: a.gclid || '',
    gbraid: a.gbraid || '',
    wbraid: a.wbraid || '',
    sessionId: a.sessionId || sessionId(),
    landingPath: a.landingPath || '',
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

function postFirstParty(body) {
  const payload = JSON.stringify(body)
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'text/plain' })
      navigator.sendBeacon(apiUrl('/api/public/track'), blob)
      return
    }
  } catch {
    /* fallback */
  }
  fetch(apiUrl('/api/public/track'), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: payload,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {})
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

  await track(EVENTS.PAGE_VIEW, { path: pathname || '/' })
}

function gaMeasurementId() {
  return String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim()
}

function adsId() {
  return String(import.meta.env.VITE_GOOGLE_ADS_ID || '').trim()
}

function ensureGtag() {
  if (typeof window === 'undefined') return false
  if (window.gtag) return true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  return true
}

function loadGtagScript() {
  const gaId = gaMeasurementId()
  const awId = adsId()
  const scriptId = gaId || awId
  if (!scriptId || document.querySelector('script[data-nolio-gtag]')) return

  const script = document.createElement('script')
  script.async = true
  script.dataset.nolioGtag = '1'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(scriptId)}`
  document.head.appendChild(script)
}

/** Charge GA4 / Google Ads uniquement après consentement. */
export function initGoogleAnalytics() {
  if (typeof window === 'undefined') return null
  const analyticsOk = hasAnalyticsConsent()
  const adsOk = hasAdsConsent()
  const gaId = analyticsOk ? gaMeasurementId() : ''
  const awId = adsOk ? adsId() : ''
  if (!gaId && !awId) return null

  ensureGtag()
  if (!window.__nolioGtagBooted) {
    window.gtag('js', new Date())
    window.__nolioGtagBooted = true
  }

  loadGtagScript()

  if (gaId && !window.__nolioGaConfigured) {
    window.gtag('config', gaId, {
      anonymize_ip: true,
      send_page_view: false,
      allow_google_signals: adsOk,
    })
    window.__nolioGaConfigured = true
  }

  // Google Ads : on prépare le tag AW- si l’ID est fourni. Pas de conversion
  // send_to tant que les vrais labels ne sont pas configurés.
  if (awId && !window.__nolioAdsConfigured) {
    window.gtag('config', awId)
    window.__nolioAdsConfigured = true
  }

  return gaId || awId
}

export function disableGoogleScripts() {
  window.__nolioGaConfigured = false
  window.__nolioAdsConfigured = false
  if (typeof window.gtag === 'function') {
    const gaId = gaMeasurementId()
    if (gaId) window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied' })
  }
}

function sendGoogle(name, params = {}) {
  if (!hasAnalyticsConsent() && !hasAdsConsent()) return
  initGoogleAnalytics()
  if (typeof window === 'undefined' || !window.gtag) return

  if (hasAnalyticsConsent() && gaMeasurementId()) {
    const safe = { ...params }
    BLOCKED_GA_KEYS.forEach((key) => delete safe[key])
    window.gtag('event', name, safe)
  }
}

export function gaEvent(name, params = {}) {
  sendGoogle(name, params)
}

export async function track(name, props = {}) {
  if (typeof window === 'undefined' || !name) return
  if (name === EVENTS.PURCHASE) return

  captureAcquisition()
  const acquisition = acquisitionPayload()
  const path = props.path || window.location.pathname || '/'

  if (name === EVENTS.VIEW_PRICING) {
    try {
      if (sessionStorage.getItem(PRICING_KEY) === '1') return
      sessionStorage.setItem(PRICING_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  if (FIRST_PARTY_TYPES.has(name) && (name !== EVENTS.PAGE_VIEW || shouldTrackPath(path))) {
    postFirstParty({
      type: name,
      path,
      referrer: document.referrer || '',
      plan: props.plan || '',
      ...acquisition,
    })
  }

  const gaParams = {
    plan: props.plan || undefined,
    method: props.method || undefined,
    surface: props.surface || undefined,
    currency: props.currency || undefined,
    value: props.value,
  }
  Object.keys(gaParams).forEach((key) => {
    if (gaParams[key] === undefined || gaParams[key] === '') delete gaParams[key]
  })
  sendGoogle(name, gaParams)
}

export function getAnalyticsSessionId() {
  return sessionId()
}
