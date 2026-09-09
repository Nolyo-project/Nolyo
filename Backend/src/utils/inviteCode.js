const crypto = require('crypto')
const SubscriptionRequest = require('../models/SubscriptionRequest')

function createInviteCode() {
  const raw = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `NOLYO-${raw.slice(0, 4)}-${raw.slice(4)}`
}

function normalizeInviteCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function inviteCodeCandidates(code) {
  const normalized = normalizeInviteCode(code)
  if (!normalized) return []
  const rest = normalized.replace(/^(NOLIO|NOLYO)-/, '')
  if (rest === normalized) return [normalized]
  return [...new Set([`NOLYO-${rest}`, `NOLIO-${rest}`])]
}

async function ensureInviteCode(request) {
  if (request.inviteCode) return request.inviteCode
  let code = createInviteCode()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await SubscriptionRequest.findOne({ inviteCode: code })
    if (!clash) break
    code = createInviteCode()
  }
  request.inviteCode = code
  request.inviteCodeCreatedAt = new Date()
  return code
}

module.exports = { createInviteCode, normalizeInviteCode, inviteCodeCandidates, ensureInviteCode }
