const express = require('express')
const User = require('../models/User')
const SubscriptionRequest = require('../models/SubscriptionRequest')
const AccountDeletionRequest = require('../models/AccountDeletionRequest')
const { requireAuth } = require('../middleware/auth')
const { signToken, tokenExpiresAt } = require('../utils/token')
const { normalizeInviteCode, inviteCodeCandidates } = require('../utils/inviteCode')
const { handleMulter, saveImage, removeFile } = require('../utils/uploads')
const { RESERVED } = require('./public')
const { TRADE_IDS, WORK_MODES, publicTrades } = require('../data/trades')
const { pickWorkspace } = require('../data/workspace')
const { startMemberSubscription } = require('../utils/stripe')
const { hasAcquisition, pickAcquisition, trackEvent } = require('../utils/analytics')
const { sendWelcome } = require('../utils/emails')
const { applyOnboarding } = require('../utils/applyOnboarding')
const { passwordStrengthError } = require('../utils/password')

async function sendUser(res, user, status = 200, extras = {}) {
  const json = await AccountDeletionRequest.decorateUser(user)
  const preview = previewExtras(res.req || {})
  return res.status(status).json({ user: withPreviewPlan({ ...json, ...preview, ...extras }) })
}

function founderRole(user) {
  return user.onboarding?.tradeLabel || 'Fondateur'
}

function ensureFounderPerson(page, user, photo = '') {
  const people = [...(page.about?.people || [])]
  const nextPhoto = photo || user.avatar || ''
  if (!people.length) {
    people.push({
      name: user.name || '',
      role: founderRole(user),
      bio: '',
      photo: nextPhoto,
    })
  } else {
    const first = { ...people[0] }
    if (!first.photo && nextPhoto) first.photo = nextPhoto
    if (!first.name) first.name = user.name || ''
    if (!first.role) first.role = founderRole(user)
    people[0] = first
  }
  page.about = { ...(page.about || { body: '' }), people }
  return page
}

function previewExtras(req) {
  if (!req.auth?.preview || !req.auth.exp) return {}
  const previewPlan = req.auth.previewPlan === 'essentiel' ? 'essentiel' : 'pro'
  return {
    preview: true,
    previewPlan,
    previewExpiresAt: new Date(req.auth.exp * 1000).toISOString(),
  }
}

function withPreviewPlan(userJson) {
  if (!userJson?.preview) return userJson
  const previewPlan = userJson.previewPlan === 'essentiel' ? 'essentiel' : 'pro'
  const raw = userJson.subscription
  const subscription =
    raw && typeof raw.toObject === 'function'
      ? raw.toObject({ depopulate: true })
      : raw && raw._doc
        ? { ...raw._doc }
        : { ...(raw || {}) }
  delete subscription.$__parent
  delete subscription.$__
  delete subscription.$isNew
  return {
    ...userJson,
    previewPlan,
    subscription: {
      ...subscription,
      plan: previewPlan,
    },
  }
}

const previewAttempts = new Map()

function tooManyPreviews(ip) {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const current = (previewAttempts.get(ip) || []).filter((at) => now - at < windowMs)
  if (current.length >= 8) {
    previewAttempts.set(ip, current)
    return true
  }
  current.push(now)
  previewAttempts.set(ip, current)
  return false
}

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

  if (passwordStrengthError(password)) {
    return res.status(400).json({ error: passwordStrengthError(password) })
  }

  if (!code) {
    return res.status(400).json({
      error: 'Un code unique fourni par le président est obligatoire pour s’inscrire.',
    })
  }

  const request = await SubscriptionRequest.findOne({ inviteCode: { $in: inviteCodeCandidates(code) } })
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
    const fromRequest = pickAcquisition(request.acquisition || {})
    const fromBody = pickAcquisition(req.body?.acquisition || {})
    const acquisition = hasAcquisition(fromRequest) ? fromRequest : fromBody
    const user = await User.create({
      name,
      email,
      passwordHash: await User.hashPassword(password),
      role: 'member',
      request: request._id,
      ...(hasAcquisition(acquisition) ? { acquisition } : {}),
      subscription: {
        plan: request.plan,
        status: 'trialing',
        company: request.company,
        teamSize: request.teamSize,
        activatedAt: now,
      },
    })

    try {
      await startMemberSubscription(user, request)
      await user.save()
    } catch (err) {
      console.error('Stripe subscription', err.message)
      await user.save()
    }

    request.status = 'registered'
    request.registeredAt = now
    request.user = user._id
    await request.save()

    sendWelcome(user).catch((e) => console.error('Mail bienvenue', e.message))

    const funnel = {
      path: '/inscription',
      plan: request.plan,
      source: acquisition.source,
      medium: acquisition.medium,
      campaign: acquisition.campaign,
      sessionId: acquisition.sessionId,
    }
    trackEvent({ type: 'sign_up', ...funnel, meta: { userId: String(user._id) } }).catch((err) =>
      console.error('analytics sign_up', err.message),
    )
    trackEvent({ type: 'trial_start', ...funnel, meta: { userId: String(user._id) } }).catch((err) =>
      console.error('analytics trial_start', err.message),
    )

    return res.status(201).json({
      token: signToken(user),
      user: await AccountDeletionRequest.decorateUser(user),
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
    user: await AccountDeletionRequest.decorateUser(user),
  })
})

router.get('/me', requireAuth, async (req, res) => {
  await sendUser(res, req.user)
})

router.post('/preview', async (req, res) => {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  if (tooManyPreviews(ip)) {
    return res.status(429).json({ error: 'Trop d’essais. Réessayez dans un moment.' })
  }

  const { hasWorkspaceAccess } = require('../utils/billing')
  const { ensurePreviewAccount } = require('../seed/demoMember')

  const previewPlan = req.body?.plan === 'essentiel' ? 'essentiel' : 'pro'
  let user = await ensurePreviewAccount(previewPlan)
  if (!user || !hasWorkspaceAccess(user)) {
    return res.status(503).json({ error: 'La prévisualisation n’est pas disponible pour le moment.' })
  }

  const token = signToken(user, { expiresIn: '5m', preview: true, previewPlan })
  const extras = {
    preview: true,
    previewPlan,
    previewExpiresAt: tokenExpiresAt(token),
  }
  try {
    const { trackEvent } = require('../utils/analytics')
    await trackEvent({
      type: 'preview_start',
      plan: previewPlan,
      path: '/dashboard',
      referrer: req.get('referer') || '',
      sessionId: String(req.body?.sessionId || '').slice(0, 64),
    })
  } catch (_) {
    /* ignore */
  }
  const json = await AccountDeletionRequest.decorateUser(user)
  res.json({
    token,
    user: withPreviewPlan({ ...json, ...extras }),
    expiresAt: extras.previewExpiresAt,
  })
})

router.get('/onboarding', requireAuth, (req, res) => {
  res.json({
    trades: publicTrades(),
    preparePage: req.user.subscription?.plan === 'pro',
  })
})

router.post('/onboarding', requireAuth, async (req, res) => {
  if (req.user.role === 'president') {
    return res.status(403).json({ error: 'Espace réservé au président.' })
  }
  const { hasWorkspaceAccess } = require('../utils/billing')
  if (!hasWorkspaceAccess(req.user)) {
    return res.status(403).json({ error: 'Un abonnement actif est requis.' })
  }
  if (req.user.onboarding?.completedAt) {
    return res.status(409).json({ error: 'Votre espace est déjà prêt.' })
  }

  const trade = String(req.body?.trade || '').trim()
  const workMode = String(req.body?.workMode || '').trim()
  const company = String(req.body?.company || '').trim().slice(0, 80)
  const city = String(req.body?.city || '').trim().slice(0, 80)
  const tradeLabel = String(req.body?.tradeLabel || '').trim().slice(0, 60)
  const title = String(req.body?.title || '').trim().slice(0, 80)
  const description = String(req.body?.description || '').trim().slice(0, 800)
  const displayAs = req.body?.displayAs === 'person' ? 'person' : 'company'
  const services = Array.isArray(req.body?.services)
    ? req.body.services.map((name) => String(name || '').trim()).filter(Boolean).slice(0, 8)
    : []

  if (!TRADE_IDS.includes(trade)) {
    return res.status(400).json({ error: 'Choisissez votre métier.' })
  }
  if (trade === 'other' && tradeLabel.length < 2) {
    return res.status(400).json({ error: 'Précisez votre métier.' })
  }
  if (company.length < 2) {
    return res.status(400).json({ error: 'Indiquez le nom de votre activité.' })
  }
  if (!WORK_MODES.includes(workMode)) {
    return res.status(400).json({ error: 'Indiquez comment vous travaillez.' })
  }
  const preparePage = req.user.subscription?.plan === 'pro'
  if (preparePage && title.length < 2) {
    return res.status(400).json({ error: 'Indiquez le titre de votre page.' })
  }

  const user = await applyOnboarding(req.user, {
    trade,
    tradeLabel,
    workMode,
    company,
    city,
    title,
    description,
    displayAs,
    services,
  })
  trackEvent({
    type: 'onboarding_complete',
    path: '/onboarding',
    plan: user.subscription?.plan || '',
    source: user.acquisition?.source,
    medium: user.acquisition?.medium,
    campaign: user.acquisition?.campaign,
    sessionId: user.acquisition?.sessionId,
    meta: { userId: String(user._id) },
  }).catch((err) => console.error('analytics onboarding', err.message))
  await sendUser(res, user)
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
    const strength = passwordStrengthError(newPassword)
    if (strength) {
      return res.status(400).json({ error: strength })
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
  if (req.body?.quoteFollowUpDays !== undefined) {
    const days = Number(req.body.quoteFollowUpDays)
    if (!Number.isFinite(days) || days < -1 || days > 90) {
      return res.status(400).json({ error: 'Délai de relance invalide.' })
    }
    req.user.quoteFollowUpDays = Math.round(days)
  }
  if (['email', 'phone', 'both'].includes(req.body?.quoteFollowUpChannel)) {
    req.user.quoteFollowUpChannel = req.body.quoteFollowUpChannel
  }
  if (req.body?.notifications && typeof req.body.notifications === 'object') {
    const current = req.user.notifications?.toObject?.() || req.user.notifications || {}
    const next = { ...current }
    for (const key of ['emailBooking', 'pushBooking', 'pushReminders', 'pushRelances']) {
      if (typeof req.body.notifications[key] === 'boolean') next[key] = req.body.notifications[key]
    }
    if ([5, 10, 15, 30, 60].includes(Number(req.body.notifications.reminderMinutes))) {
      next.reminderMinutes = Number(req.body.notifications.reminderMinutes)
    }
    if (req.body.notifications.clientBookingEmailSubject !== undefined) {
      next.clientBookingEmailSubject = String(req.body.notifications.clientBookingEmailSubject || '')
        .trim()
        .slice(0, 120)
    }
    if (req.body.notifications.clientBookingEmailBody !== undefined) {
      next.clientBookingEmailBody = String(req.body.notifications.clientBookingEmailBody || '')
        .trim()
        .slice(0, 4000)
    }
    req.user.notifications = next
  }
  if (req.body?.workspace && typeof req.body.workspace === 'object') {
    const current = req.user.workspace?.toObject?.() || req.user.workspace || {}
    const currentModules = current.modules || {}
    req.user.workspace = pickWorkspace(
      {
        displayAs: req.body.workspace.displayAs ?? current.displayAs,
        modules: { ...currentModules, ...(req.body.workspace.modules || {}) },
      },
      {
        plan: req.user.subscription?.plan,
        tradeId: req.user.onboarding?.trade,
        workMode: req.user.onboarding?.workMode,
      },
    )
  }
  if (req.body?.page && typeof req.body.page === 'object') {
    const current = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
    const incoming = req.body.page
    const next = User.pickPage({
      ...current,
      ...incoming,
      photos: incoming.photos || current.photos,
      workUrls: incoming.workUrls || current.workUrls,
      theme: incoming.theme || current.theme,
      hours: incoming.hours || current.hours,
      about: incoming.about
        ? {
            body: incoming.about.body !== undefined ? incoming.about.body : current.about.body,
            people: Array.isArray(incoming.about.people)
              ? incoming.about.people.map((person, index) => ({
                  ...person,
                  photo: person.photo || current.about.people[index]?.photo || '',
                }))
              : current.about.people,
          }
        : current.about,
    })
    const kept = new Set((next.about.people || []).map((person) => person.photo).filter(Boolean))
    for (const person of current.about.people || []) {
      if (person.photo && !kept.has(person.photo)) await removeFile(person.photo)
    }
    if (next.published) {
      if (!next.slug) {
        next.slug = User.slugify(next.title || req.user.name)
      }
      if (!next.slug) {
        return res.status(400).json({ error: 'Indiquez une adresse de page (ex. atelier-nord).' })
      }
      if (RESERVED.has(next.slug)) {
        return res.status(400).json({ error: 'Cette adresse est réservée.' })
      }
      const taken = await User.findOne({
        'page.slug': next.slug,
        _id: { $ne: req.user._id },
      })
      if (taken) {
        return res.status(409).json({ error: 'Cette adresse de page est déjà prise.' })
      }
    }
    req.user.page = next
  }
  await req.user.save()
  await sendUser(res, req.user)
})

router.post('/me/avatar', requireAuth, handleMulter, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choisissez une photo.' })
  await removeFile(req.user.avatar)
  req.user.avatar = await saveImage(req.file, 'avatars', `${req.user._id}-${Date.now()}`)
  const page = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
  req.user.page = ensureFounderPerson(page, req.user, req.user.avatar)
  await req.user.save()
  await sendUser(res, req.user)
})

router.delete('/me/avatar', requireAuth, async (req, res) => {
  const previous = req.user.avatar
  await removeFile(req.user.avatar)
  req.user.avatar = ''
  const page = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
  const people = [...(page.about?.people || [])]
  if (people[0]?.photo && people[0].photo === previous) {
    people[0] = { ...people[0], photo: '' }
    page.about = { ...page.about, people }
    req.user.page = page
  }
  await req.user.save()
  await sendUser(res, req.user)
})

router.post('/me/page/photos', requireAuth, handleMulter, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choisissez une photo.' })
  const index = Math.min(1, Math.max(0, Number(req.body?.index) || 0))
  const page = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
  await removeFile(page.photos[index])
  page.photos[index] = await saveImage(req.file, 'pages', `${req.user._id}-${index}-${Date.now()}`)
  req.user.page = page
  await req.user.save()
  await sendUser(res, req.user)
})

router.post('/me/page/banner', requireAuth, handleMulter, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choisissez une photo.' })
  const page = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
  await removeFile(page.banner)
  page.banner = await saveImage(req.file, 'pages', `${req.user._id}-banner-${Date.now()}`)
  req.user.page = page
  await req.user.save()
  await sendUser(res, req.user)
})

router.delete('/me/page/banner', requireAuth, async (req, res) => {
  const page = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
  await removeFile(page.banner)
  page.banner = ''
  req.user.page = page
  await req.user.save()
  await sendUser(res, req.user)
})

router.post('/me/page/people/:index/photo', requireAuth, handleMulter, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choisissez une photo.' })
  const index = Math.min(5, Math.max(0, Number(req.params.index) || 0))
  const page = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
  const people = [...(page.about.people || [])]
  while (people.length <= index) people.push({ name: '', role: '', bio: '', photo: '' })
  await removeFile(people[index].photo)
  people[index] = {
    ...people[index],
    photo: await saveImage(req.file, 'pages', `${req.user._id}-person-${index}-${Date.now()}`),
    name: people[index].name || req.user.name || '',
    role: people[index].role || (index === 0 ? founderRole(req.user) : ''),
  }
  page.about = { ...page.about, people }
  req.user.page = page
  await req.user.save()
  await sendUser(res, req.user)
})

router.delete('/me/page/people/:index/photo', requireAuth, async (req, res) => {
  const index = Math.min(5, Math.max(0, Number(req.params.index) || 0))
  const page = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
  const people = [...(page.about.people || [])]
  if (!people[index]) return res.status(404).json({ error: 'Personne introuvable.' })
  await removeFile(people[index].photo)
  people[index] = { ...people[index], photo: '' }
  page.about = { ...page.about, people }
  req.user.page = page
  await req.user.save()
  await sendUser(res, req.user)
})

router.delete('/me/page/photos/:index', requireAuth, async (req, res) => {
  const index = Math.min(1, Math.max(0, Number(req.params.index) || 0))
  const page = User.pickPage(req.user.page?.toObject?.() || req.user.page || {})
  await removeFile(page.photos[index])
  page.photos[index] = ''
  req.user.page = page
  await req.user.save()
  await sendUser(res, req.user)
})

router.post('/me/deletion-request', requireAuth, async (req, res) => {
  const message = String(req.body?.message || '').trim()
  if (message.length < 12) {
    return res.status(400).json({ error: 'Expliquez en quelques lignes pourquoi vous partez.' })
  }

  const pending = await AccountDeletionRequest.findOne({ user: req.user._id, status: 'pending' })
  if (pending) {
    return res.status(409).json({ error: 'Une demande est déjà en attente chez le fondateur.' })
  }

  const created = await AccountDeletionRequest.create({
    user: req.user._id,
    name: req.user.name,
    email: req.user.email,
    company: req.user.subscription?.company || req.user.business?.tradeName || '',
    plan: req.user.subscription?.plan || '',
    message,
    status: 'pending',
  })

  const user = await AccountDeletionRequest.decorateUser(req.user)
  res.status(201).json({ user, deletionRequest: created.toMemberJSON() })
})

module.exports = router
