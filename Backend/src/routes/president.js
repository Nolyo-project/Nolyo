const express = require('express')
const SubscriptionRequest = require('../models/SubscriptionRequest')
const { requireAuth, requirePresident } = require('../middleware/auth')
const { createInviteCode } = require('../utils/inviteCode')

const router = express.Router()

router.use(requireAuth, requirePresident)

router.get('/requests', async (_req, res) => {
  const requests = await SubscriptionRequest.find().sort({ createdAt: -1 })
  const counts = {
    received: 0,
    quote_sent: 0,
    paid: 0,
    code_issued: 0,
    registered: 0,
  }

  for (const item of requests) {
    if (counts[item.status] !== undefined) counts[item.status] += 1
  }

  res.json({
    counts,
    requests: requests.map((item) => item.toPresidentJSON()),
  })
})

router.post('/requests/:id/send-quote', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  if (request.status !== 'received') {
    return res.status(400).json({ error: 'Le devis a déjà été traité pour cette demande.' })
  }

  request.status = 'quote_sent'
  request.quoteNote = String(req.body?.quoteNote || '').trim()
  request.quoteSentAt = new Date()
  await request.save()

  res.json({ request: request.toPresidentJSON() })
})

router.post('/requests/:id/confirm-payment', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  if (request.status !== 'quote_sent') {
    return res.status(400).json({
      error: 'Confirmez d’abord l’envoi du devis, puis le retour signé et le paiement.',
    })
  }

  request.status = 'paid'
  request.paidAt = new Date()
  await request.save()

  res.json({ request: request.toPresidentJSON() })
})

router.post('/requests/:id/issue-code', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  if (request.status !== 'paid' && request.status !== 'code_issued') {
    return res.status(400).json({
      error: 'Le devis signé et le paiement doivent être reçus avant de délivrer un code.',
    })
  }

  if (!request.inviteCode) {
    let code = createInviteCode()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = await SubscriptionRequest.findOne({ inviteCode: code })
      if (!clash) break
      code = createInviteCode()
    }

    request.inviteCode = code
    request.inviteCodeCreatedAt = new Date()
  }

  request.status = 'code_issued'
  await request.save()

  res.json({ request: request.toPresidentJSON() })
})

module.exports = router
