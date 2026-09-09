const webpush = require('web-push')

function pushEnabled() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function configurePush() {
  if (!pushEnabled()) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || process.env.MAIL_FROM || 'mailto:bonjour@nolyo.fr',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  return true
}

function publicVapidKey() {
  return process.env.VAPID_PUBLIC_KEY || ''
}

async function sendPushToUser(user, payload) {
  if (!configurePush()) return { skipped: true }
  const subs = user.notifications?.pushSubscriptions || []
  if (!subs.length) return { skipped: true }

  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const kept = []
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
        },
        body,
      )
      kept.push(sub)
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) continue
      kept.push(sub)
      console.error('Push fail', err.message)
    }
  }

  if (kept.length !== subs.length) {
    user.notifications = {
      ...(user.notifications?.toObject?.() || user.notifications || {}),
      pushSubscriptions: kept,
    }
    await user.save()
  }
  return { ok: true, sent: kept.length }
}

module.exports = { pushEnabled, publicVapidKey, sendPushToUser, configurePush }
