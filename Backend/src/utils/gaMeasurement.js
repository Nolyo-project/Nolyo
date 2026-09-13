function measurementId() {
  return String(process.env.GA_MEASUREMENT_ID || '').trim()
}

function apiSecret() {
  return String(process.env.GA_API_SECRET || '').trim()
}

function clientIdFrom(sessionId) {
  const raw = String(sessionId || Date.now())
  return raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64) || String(Date.now())
}

function isConfigured() {
  return Boolean(measurementId() && apiSecret())
}

async function sendGa4Event({ name, params = {}, sessionId }) {
  if (!isConfigured() || !name) return false

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId())}&api_secret=${encodeURIComponent(apiSecret())}`
  const body = {
    client_id: clientIdFrom(sessionId),
    events: [{ name, params }],
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.error('GA4 MP', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (err) {
    console.error('GA4 MP', err.message)
    return false
  }
}

async function sendGa4Purchase({ transactionId, value, currency = 'EUR', plan, sessionId }) {
  if (!isConfigured()) return false
  const amount = Number(value)
  if (!(amount > 0) || !transactionId) return false
  return sendGa4Event({
    name: 'purchase',
    sessionId,
    params: {
      transaction_id: String(transactionId),
      value: Math.round(amount * 100) / 100,
      currency: String(currency || 'EUR').toUpperCase(),
      items: [
        {
          item_id: plan || 'nolyo',
          item_name: plan === 'pro' ? 'Nolyo Pro' : plan === 'essentiel' ? 'Nolyo Essentiel' : 'Nolyo',
          price: Math.round(amount * 100) / 100,
          quantity: 1,
        },
      ],
    },
  })
}

module.exports = { sendGa4Event, sendGa4Purchase, isConfigured }
