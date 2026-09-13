const express = require('express')
const { plans, getPlan } = require('../config/plans')
const SubscriptionRequest = require('../models/SubscriptionRequest')
const User = require('../models/User')
const { sendRequestReceived, sendFounderNewRequest } = require('../utils/emails')
const { createCustomerForRequest } = require('../utils/stripe')
const { hasAcquisition, pickAcquisition, trackEvent } = require('../utils/analytics')

const router = express.Router()

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

  const acquisition = pickAcquisition(req.body?.acquisition || req.body)
  const request = await SubscriptionRequest.create({
    name,
    email,
    company,
    teamSize,
    plan: plan.id,
    message,
    status: 'received',
    ...(hasAcquisition(acquisition) ? { acquisition } : {}),
  })

  trackEvent({
    type: 'generate_lead',
    path: '/abonnement',
    plan: plan.id,
    source: acquisition.source,
    medium: acquisition.medium,
    campaign: acquisition.campaign,
    sessionId: acquisition.sessionId,
    meta: { requestId: String(request._id) },
  }).catch((err) => console.error('analytics lead', err.message))

  try {
    await createCustomerForRequest(request)
  } catch (err) {
    console.error('Stripe customer', err.message)
  }

  let mail = { ok: false, error: null, founder: false }

  // Fondateur d’abord (EmailJS 1 req/s) — sinon l’alerte tombe souvent
  try {
    const founder =
      (await User.findOne({ role: 'president' }).select('name email')) || {
        name: process.env.PRESIDENT_NAME || 'Florentin',
        email: '',
      }
    const alertTo = String(process.env.PRESIDENT_EMAIL || founder.email || '')
      .trim()
      .toLowerCase()
    if (!alertTo) {
      console.error('Mail fondateur: aucune adresse (PRESIDENT_EMAIL / compte président)')
    } else {
      await sendFounderNewRequest(request, { name: founder.name, email: alertTo })
      mail.founder = true
      console.info('[mail] alerte fondateur →', alertTo)
    }
  } catch (err) {
    console.error('Mail fondateur demande', err?.text || err.message)
  }

  await sleep(2000)

  try {
    await sendRequestReceived(request)
    mail.ok = true
    console.info('[mail] demande client →', request.email)
  } catch (err) {
    mail.error = err?.text || err?.message || 'Échec envoi e-mail'
    console.error('Mail demande', mail.error)
  }

  res.status(201).json({
    message: mail.ok
      ? 'Votre demande a bien été transmise. Un e-mail de confirmation vous a été envoyé. Vous recevrez ensuite un devis, puis un code unique pour vous inscrire. Le premier mois est offert.'
      : 'Votre demande a bien été transmise. L’e-mail de confirmation n’a pas pu partir pour le moment — nous vous recontacterons.',
    mail,
    request: {
      id: request._id,
      plan: request.plan,
      status: request.status,
      email: request.email,
    },
  })
})

module.exports = router
