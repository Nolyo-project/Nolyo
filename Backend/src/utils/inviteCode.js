const crypto = require('crypto')

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

module.exports = { createInviteCode, normalizeInviteCode, inviteCodeCandidates }
