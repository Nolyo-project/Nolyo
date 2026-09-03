const express = require('express')
const { plans, getPlan } = require('../config/plans')
const SubscriptionRequest = require('../models/SubscriptionRequest')

const router = express.Router()

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

router.get('/plans', (_req, res) => {
  res.json({ plans })
})

router.post('/', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const company = String(req.body?.company || '').trim()
  const teamSize = '2'
  const message = String(req.body?.message || '').trim()
  const plan = getPlan(req.body?.plan)

  if (name.length < 2) {
    return res.status(400).json({ error: 'Indiquez votre nom.' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' })
  }

  if (!company) {
    return res.status(400).json({ error: 'Indiquez votre société ou votre activité.' })
  }

  if (!plan) {
    return res.status(400).json({ error: 'Choisissez une offre valide.' })
  }

  const open = await SubscriptionRequest.findOne({
    email,
    status: { $ne: 'registered' },
  })

  if (open) {
    return res.status(409).json({
      error: 'Une demande est déjà en cours pour cet e-mail. Le président vous recontactera.',
    })
  }

  const request = await SubscriptionRequest.create({
    name,
    email,
    company,
    teamSize,
    plan: plan.id,
    message,
    status: 'received',
  })

  res.status(201).json({
    message:
      'Votre demande a bien été transmise. Vous recevrez un devis, puis un code unique pour vous inscrire.',
    request: {
      id: request._id,
      plan: request.plan,
      status: request.status,
      email: request.email,
    },
  })
})

module.exports = router
