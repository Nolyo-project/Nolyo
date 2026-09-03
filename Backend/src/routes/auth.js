const express = require('express')
const User = require('../models/User')
const SubscriptionRequest = require('../models/SubscriptionRequest')
const { requireAuth } = require('../middleware/auth')
const { signToken } = require('../utils/token')
const { normalizeInviteCode } = require('../utils/inviteCode')

const router = express.Router()

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

router.post('/register', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const code = normalizeInviteCode(req.body?.code)

  if (name.length < 2) {
    return res.status(400).json({ error: 'Indiquez votre nom (2 caractères minimum).' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' })
  }

  if (!code) {
    return res.status(400).json({
      error: 'Un code unique fourni par le président est obligatoire pour s’inscrire.',
    })
  }

  const request = await SubscriptionRequest.findOne({ inviteCode: code })
  if (!request || request.status !== 'code_issued') {
    return res.status(400).json({ error: 'Ce code est invalide ou déjà utilisé.' })
  }

  if (request.email !== email) {
    return res.status(400).json({
      error: 'Utilisez l’adresse e-mail indiquée dans votre demande d’abonnement.',
    })
  }

  const existing = await User.findOne({ email })
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' })
  }

  try {
    const now = new Date()
    const user = await User.create({
      name,
      email,
      passwordHash: await User.hashPassword(password),
      role: 'member',
      request: request._id,
      subscription: {
        plan: request.plan,
        status: 'active',
        company: request.company,
        teamSize: request.teamSize,
        activatedAt: now,
      },
    })

    request.status = 'registered'
    request.registeredAt = now
    request.user = user._id
    await request.save()

    return res.status(201).json({
      token: signToken(user),
      user: user.toSafeJSON(),
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' })
    }
    throw err
  }
})

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')

  const user = await User.findOne({ email })
  if (!user || !(await user.checkPassword(password))) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' })
  }

  res.json({
    token: signToken(user),
    user: user.toSafeJSON(),
  })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() })
})

router.patch('/me', requireAuth, async (req, res) => {
  const name = req.body?.name !== undefined ? String(req.body.name).trim() : req.user.name
  const email =
    req.body?.email !== undefined
      ? String(req.body.email).trim().toLowerCase()
      : req.user.email
  const company =
    req.body?.company !== undefined
      ? String(req.body.company).trim()
      : req.user.subscription?.company || ''
  const currentPassword = String(req.body?.currentPassword || '')
  const newPassword = String(req.body?.newPassword || '')

  if (name.length < 2) {
    return res.status(400).json({ error: 'Indiquez votre nom (2 caractères minimum).' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' })
  }

  if (email !== req.user.email) {
    const existing = await User.findOne({ email, _id: { $ne: req.user._id } })
    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' })
    }
    if (!(await req.user.checkPassword(currentPassword))) {
      return res.status(400).json({ error: 'Indiquez votre mot de passe actuel pour changer d’e-mail.' })
    }
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' })
    }
    if (!(await req.user.checkPassword(currentPassword))) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect.' })
    }
    req.user.passwordHash = await User.hashPassword(newPassword)
  }

  req.user.name = name
  req.user.email = email
  if (!req.user.subscription) req.user.subscription = { status: 'none' }
  if (req.body?.business && typeof req.body.business === 'object') {
    const current = req.user.business?.toObject?.() || req.user.business || {}
    req.user.business = User.pickBusiness({ ...current, ...req.body.business })
    const displayName = req.user.business.tradeName || req.user.business.legalName
    req.user.subscription.company = displayName || company
  } else {
    req.user.subscription.company = company
  }
  if (req.body?.depositPlan !== undefined) {
    req.user.depositPlan = User.pickDepositPlan(req.body.depositPlan)
  }
  await req.user.save()
  res.json({ user: req.user.toSafeJSON() })
})

module.exports = router
