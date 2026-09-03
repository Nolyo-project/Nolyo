const crypto = require('crypto')

function createInviteCode() {
  const raw = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `NOLIO-${raw.slice(0, 4)}-${raw.slice(4)}`
}

function normalizeInviteCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

module.exports = { createInviteCode, normalizeInviteCode }
