const AnalyticsEvent = require('../models/AnalyticsEvent')

function truncate(value, max) {
  return String(value || '').trim().slice(0, max)
}

function hostFromReferrer(referrer) {
  try {
    if (!referrer) return ''
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    return host.slice(0, 80)
  } catch {
    return ''
  }
}

function resolveSource({ source, referrer, path }) {
  const utm = truncate(source, 80).toLowerCase()
  if (utm) return utm
  const host = hostFromReferrer(referrer)
  if (!host) return path === '/' || !path ? 'direct' : 'direct'
  if (host.includes('google')) return 'google'
  if (host.includes('facebook') || host.includes('fb.')) return 'facebook'
  if (host.includes('instagram')) return 'instagram'
  if (host.includes('linkedin')) return 'linkedin'
  if (host.includes('tiktok')) return 'tiktok'
  if (host.includes('bing')) return 'bing'
  if (host.includes('nolyo')) return 'nolyo'
  return host
}

const ALLOWED_TYPES = AnalyticsEvent.TYPES

function pickAcquisition(input = {}) {
  return {
    source: truncate(input.source || input.utm_source, 80),
    medium: truncate(input.medium || input.utm_medium, 80),
    campaign: truncate(input.campaign || input.utm_campaign, 120),
    gclid: truncate(input.gclid, 200),
    gbraid: truncate(input.gbraid, 200),
    wbraid: truncate(input.wbraid, 200),
    sessionId: truncate(input.sessionId, 64),
    landingPath: truncate(input.landingPath || input.path, 300),
  }
}

function hasAcquisition(acq = {}) {
  return Boolean(acq.source || acq.medium || acq.campaign || acq.gclid || acq.gbraid || acq.wbraid || acq.sessionId)
}

async function trackEvent(payload = {}) {
  const type = payload.type
  if (!ALLOWED_TYPES.includes(type)) return null

  const path = truncate(payload.path, 300)
  const referrer = truncate(payload.referrer, 500)
  const source = resolveSource({
    source: payload.source || payload.utm_source,
    referrer,
    path,
  })

  try {
    return await AnalyticsEvent.create({
      type,
      path,
      plan: payload.plan === 'essentiel' || payload.plan === 'pro' ? payload.plan : '',
      referrer,
      source,
      medium: truncate(payload.medium || payload.utm_medium, 80),
      campaign: truncate(payload.campaign || payload.utm_campaign, 120),
      sessionId: truncate(payload.sessionId, 64),
      meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : undefined,
    })
  } catch (err) {
    console.error('analytics track', err.message)
    return null
  }
}

async function recordPaidPurchase({ transactionId, value, currency = 'EUR', plan, acquisition = {} }) {
  const amount = Number(value)
  const id = String(transactionId || '').trim()
  if (!(amount > 0) || !id) return null

  const existing = await AnalyticsEvent.findOne({ type: 'purchase', 'meta.transactionId': id })
  if (existing) return existing

  return trackEvent({
    type: 'purchase',
    path: '/facture',
    plan,
    source: acquisition.source,
    medium: acquisition.medium,
    campaign: acquisition.campaign,
    sessionId: acquisition.sessionId,
    meta: {
      transactionId: id,
      value: Math.round(amount * 100) / 100,
      currency: String(currency || 'EUR').toUpperCase(),
    },
  })
}

function startOfDaysAgo(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d
}

module.exports = {
  trackEvent,
  resolveSource,
  startOfDaysAgo,
  hostFromReferrer,
  pickAcquisition,
  hasAcquisition,
  recordPaidPurchase,
}
