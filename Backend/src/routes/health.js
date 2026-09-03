const express = require('express')

const router = express.Router()

router.get('/', async (_req, res) => {
  const state = require('mongoose').connection.readyState
  const connected = state === 1
  res.json({
    ok: true,
    db: connected ? 'connected' : 'disconnected',
    message: connected ? 'API et MongoDB opérationnels.' : 'API OK, MongoDB déconnecté.',
  })
})

module.exports = router
