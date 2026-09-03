const jwt = require('jsonwebtoken')

function signToken(user) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is missing from environment variables')
  }

  return jwt.sign({ sub: user._id.toString() }, secret, { expiresIn: '7d' })
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

module.exports = { signToken, verifyToken }
