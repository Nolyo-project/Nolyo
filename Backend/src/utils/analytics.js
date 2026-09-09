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

async function trackEvent(payload = {}) {
  const type = payload.type
  if (type !== 'page_view' && type !== 'preview_start') return null

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
    })
  } catch (err) {
    console.error('analytics track', err.message)
    return null
  }
}

function startOfDaysAgo(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d
}

module.exports = { trackEvent, resolveSource, startOfDaysAgo, hostFromReferrer }
