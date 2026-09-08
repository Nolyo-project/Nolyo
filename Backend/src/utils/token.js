const jwt = require('jsonwebtoken')

function signToken(user, { expiresIn = '7d', preview = false } = {}) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is missing from environment variables')
  }

  const payload = { sub: user._id.toString() }
  if (preview) payload.preview = true

  return jwt.sign(payload, secret, { expiresIn })
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

function tokenExpiresAt(token) {
  const decoded = jwt.decode(token)
  if (!decoded?.exp) return new Date(Date.now() + 5 * 60 * 1000).toISOString()
  return new Date(decoded.exp * 1000).toISOString()
}

module.exports = { signToken, verifyToken, tokenExpiresAt }
