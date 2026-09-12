const express = require('express')
const { mailEnabled } = require('../utils/mail')

const router = express.Router()

router.get('/', async (_req, res) => {
  const state = require('mongoose').connection.readyState
  const connected = state === 1
  const mail = mailEnabled()
  res.json({
    ok: true,
    db: connected ? 'connected' : 'disconnected',
    mail: mail ? 'configured' : 'disabled',
    message: connected ? 'API et MongoDB opérationnels.' : 'API OK, MongoDB déconnecté.',
  })
})

module.exports = router
