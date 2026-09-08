const express = require('express')
const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const Service = require('../models/Service')
const User = require('../models/User')
const { listAvailability, resolveSchedule, isValidPublicSlot } = require('../utils/bookingSlots')
const { hasOverlap, isDuplicateKey } = require('../utils/overlap')

const router = express.Router()

const RESERVED = new Set([
  'api',
  'login',
  'inscription',
  'abonnement',
  'dashboard',
  'president',
  'uploads',
  'p',
  'admin',
  'nolio',
  'onboarding',
  'stats',
  'rdv',
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const bookAttempts = new Map()

function socialUrl(kind, value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const handle = raw.replace(/^@/, '')
  if (kind === 'instagram') return `https://instagram.com/${handle}`
  if (kind === 'facebook') return `https://facebook.com/${handle}`
  if (kind === 'linkedin') return `https://www.linkedin.com/in/${handle}`
  return raw
}

function websiteUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

function publicService(item) {
  return {
    _id: String(item._id),
    name: item.name,
    price: item.price,
    durationMinutes: item.durationMinutes,
    kind: item.kind === 'quote' ? 'quote' : 'session',
  }
}

function publicPage(user, extras = {}) {
  const page = User.pickPage(user.page?.toObject?.() || user.page || {})
  const photos = (page.photos || []).filter(Boolean).slice(0, 3)
  return {
    title: page.title || user.subscription?.company || user.name,
    description: page.description,
    photos,
    banner: page.banner || '',
    instagram: socialUrl('instagram', page.instagram),
    facebook: socialUrl('facebook', page.facebook),
    linkedin: socialUrl('linkedin', page.linkedin),
    website: websiteUrl(page.website),
    address: page.address,
    phone: page.phone,
    email: page.email,
    theme: page.theme,
    about: page.about,
    name: user.name,
    avatar: user.avatar || '',
    trade: user.onboarding?.trade || '',
    tradeLabel: user.onboarding?.tradeLabel || '',
    ...extras,
  }
}

async function findPublishedOwner(slugParam, { requireActive = false } = {}) {
  const slug = User.slugify(slugParam)
  if (!slug || RESERVED.has(slug)) return null
  const user = await User.findOne({ 'page.slug': slug, 'page.published': true })
  if (!user) return null
  if (requireActive && user.subscription?.status !== 'active') return null
  return user
}

function tooManyBooks(ip) {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const current = (bookAttempts.get(ip) || []).filter((at) => now - at < windowMs)
  if (current.length >= 8) {
    bookAttempts.set(ip, current)
    return true
  }
  current.push(now)
  bookAttempts.set(ip, current)
  return false
}

router.get('/stats', async (_req, res) => {
  const members = await User.countDocuments({
    role: 'member',
    'subscription.status': 'active',
  })
  res.json({ members })
})

router.get('/pages/:slug', async (req, res) => {
  const user = await findPublishedOwner(req.params.slug)
  if (!user) return res.status(404).json({ error: 'Page introuvable.' })

  const services = await Service.find({ user: user._id, active: true }).sort({ sort: 1, createdAt: 1 }).limit(20)
  res.json({
    page: publicPage(user, {
      bookingAvailable: services.length > 0,
      services: services.map(publicService),
    }),
  })
})

router.get('/pages/:slug/booking', async (req, res) => {
  const user = await findPublishedOwner(req.params.slug, { requireActive: true })
  if (!user) return res.status(404).json({ error: 'Page introuvable.' })

  const services = await Service.find({ user: user._id, active: true }).sort({ sort: 1, createdAt: 1 }).limit(20)
  const schedule = resolveSchedule(user)
  res.json({
    page: publicPage(user),
    services: services.map(publicService),
    schedule: {
      workStart: schedule.workStart,
      workEnd: schedule.workEnd,
      workDays: schedule.workDays,
    },
  })
})

router.get('/pages/:slug/availability', async (req, res) => {
  const user = await findPublishedOwner(req.params.slug, { requireActive: true })
  if (!user) return res.status(404).json({ error: 'Page introuvable.' })

  const service = await Service.findOne({ _id: req.query.service, user: user._id, active: true })
  if (!service) return res.status(400).json({ error: 'Choisissez une prestation.' })

  const days = await listAvailability(user, service.durationMinutes, 21)
  res.json({ days, durationMinutes: service.durationMinutes })
})

router.post('/pages/:slug/book', async (req, res) => {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  if (tooManyBooks(ip)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' })
  }

  const user = await findPublishedOwner(req.params.slug, { requireActive: true })
  if (!user) return res.status(404).json({ error: 'Page introuvable.' })

  const service = await Service.findOne({ _id: req.body?.service, user: user._id, active: true })
  if (!service) return res.status(400).json({ error: 'Choisissez une prestation.' })

  const startAt = new Date(req.body?.startAt)
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Choisissez un créneau encore à venir.' })
  }

  const schedule = resolveSchedule(user)
  if (!isValidPublicSlot(startAt, service.durationMinutes, schedule)) {
    return res.status(400).json({ error: 'Ce créneau n’est pas proposé.' })
  }

  const firstName = String(req.body?.firstName || '').trim().slice(0, 40)
  const lastName = String(req.body?.lastName || '').trim().slice(0, 40)
  const name = [firstName, lastName].filter(Boolean).join(' ')
  const email = String(req.body?.email || '').trim().toLowerCase()
  const phone = String(req.body?.phone || '').trim().slice(0, 40)
  if (name.length < 2) return res.status(400).json({ error: 'Indiquez votre nom.' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Indiquez un e-mail valide.' })

  if (await hasOverlap(user._id, startAt, service.durationMinutes)) {
    return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
  }

  const isQuote = service.kind === 'quote'
  let contact = await Contact.findOne({ user: user._id, email }).sort({ updatedAt: -1 })
  const when = startAt.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const logEntry = {
    title: isQuote ? 'Demande de devis' : 'Réservation en ligne',
    meta: `${service.name} · ${when}`.slice(0, 160),
    at: new Date(),
  }

  if (contact) {
    if (firstName) contact.firstName = firstName
    if (lastName) contact.lastName = lastName
    if (name) contact.name = name
    if (!contact.phone && phone) contact.phone = phone
    contact.jobStatus = 'open'
    contact.completedAt = undefined
    contact.source = contact.source || 'booking'
    contact.dealLog = [...(contact.dealLog || []), logEntry].slice(-40)
    if (isQuote) {
      if (contact.kind !== 'client') contact.kind = 'prospect'
      if (contact.kind === 'prospect') {
        contact.activity = service.name
        contact.price = 0
        contact.quoteStatus = 'none'
        contact.quoteSignedAt = undefined
        contact.serviceLines = []
        contact.depositPlan = []
      }
    } else {
      contact.kind = 'client'
      contact.price = service.price
      contact.activity = service.name
      contact.serviceLines = [{ service: service._id, name: service.name, price: service.price, quantity: 1 }]
      contact.quoteStatus = 'signed'
      if (!contact.quoteSignedAt) contact.quoteSignedAt = new Date()
      contact.depositPlan = [{ label: 'Fin de soin', percent: 100, paid: false }]
    }
    await contact.save()
  } else if (isQuote) {
    contact = await Contact.create({
      user: user._id,
      firstName,
      lastName,
      name,
      email,
      phone,
      kind: 'prospect',
      source: 'booking',
      price: 0,
      activity: service.name,
      quoteStatus: 'none',
      dealLog: [logEntry],
    })
  } else {
    contact = await Contact.create({
      user: user._id,
      firstName,
      lastName,
      name,
      email,
      phone,
      kind: 'client',
      source: 'booking',
      price: service.price,
      activity: service.name,
      serviceLines: [{ service: service._id, name: service.name, price: service.price, quantity: 1 }],
      quoteStatus: 'signed',
      quoteSignedAt: new Date(),
      depositPlan: [{ label: 'Fin de soin', percent: 100, paid: false }],
      dealLog: [logEntry],
    })
  }

  let appointment
  try {
    appointment = await Appointment.create({
      user: user._id,
      contact: contact._id,
      title: `${service.name} - ${name}`.slice(0, 120),
      startAt,
      durationMinutes: service.durationMinutes,
      notes: isQuote ? 'Demande de devis en ligne' : 'Réservation en ligne',
      source: 'booking',
      kind: isQuote ? 'quote' : 'session',
      service: service._id,
      serviceName: service.name,
      servicePrice: isQuote ? 0 : service.price,
    })
  } catch (err) {
    if (isDuplicateKey(err) || (await hasOverlap(user._id, startAt, service.durationMinutes))) {
      return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
    }
    throw err
  }

  res.status(201).json({
    appointment: {
      startAt: appointment.startAt,
      durationMinutes: appointment.durationMinutes,
      serviceName: appointment.serviceName,
      servicePrice: appointment.servicePrice,
      kind: appointment.kind,
    },
    guest: { firstName, lastName, name },
    page: { title: publicPage(user).title },
  })
})

async function findPresident() {
  return User.findOne({ role: 'president' })
}

router.get('/founder/booking', async (_req, res) => {
  const user = await findPresident()
  if (!user) return res.status(404).json({ error: 'Réservation indisponible.' })
  const services = await Service.find({ user: user._id, active: true }).sort({ sort: 1, createdAt: 1 }).limit(5)
  const schedule = resolveSchedule(user)
  res.json({
    host: { name: user.name, firstName: user.name.split(' ')[0], avatar: user.avatar || '' },
    services: services.map(publicService),
    schedule: {
      workStart: schedule.workStart,
      workEnd: schedule.workEnd,
      workDays: schedule.workDays,
      durationMinutes: schedule.durationMinutes,
    },
  })
})

router.get('/founder/availability', async (req, res) => {
  const user = await findPresident()
  if (!user) return res.status(404).json({ error: 'Réservation indisponible.' })
  const service = req.query.service
    ? await Service.findOne({ _id: req.query.service, user: user._id, active: true })
    : await Service.findOne({ user: user._id, active: true }).sort({ createdAt: 1 })
  if (!service) return res.status(400).json({ error: 'Les rendez-vous ne sont pas encore ouverts.' })
  const days = await listAvailability(user, service.durationMinutes, 21)
  res.json({ days, durationMinutes: service.durationMinutes, service: publicService(service) })
})

router.post('/founder/book', async (req, res) => {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  if (tooManyBooks(ip)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' })
  }

  const user = await findPresident()
  if (!user) return res.status(404).json({ error: 'Réservation indisponible.' })

  const service = req.body?.service
    ? await Service.findOne({ _id: req.body.service, user: user._id, active: true })
    : await Service.findOne({ user: user._id, active: true }).sort({ createdAt: 1 })
  if (!service) return res.status(400).json({ error: 'Les rendez-vous ne sont pas encore ouverts.' })

  const startAt = new Date(req.body?.startAt)
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Choisissez un créneau encore à venir.' })
  }

  const schedule = resolveSchedule(user)
  if (!isValidPublicSlot(startAt, service.durationMinutes, schedule)) {
    return res.status(400).json({ error: 'Ce créneau n’est pas proposé.' })
  }

  const firstName = String(req.body?.firstName || '').trim().slice(0, 40)
  const lastName = String(req.body?.lastName || '').trim().slice(0, 40)
  const name = [firstName, lastName].filter(Boolean).join(' ')
  const email = String(req.body?.email || '').trim().toLowerCase()
  const phone = String(req.body?.phone || '').trim().slice(0, 40)
  const message = String(req.body?.message || '').trim().slice(0, 1000)
  if (name.length < 2) return res.status(400).json({ error: 'Indiquez votre nom.' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Indiquez un e-mail valide.' })

  if (await hasOverlap(user._id, startAt, service.durationMinutes)) {
    return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
  }

  const when = startAt.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const logEntry = {
    title: 'Rendez-vous découverte',
    meta: `${service.name} · ${when}`.slice(0, 160),
    at: new Date(),
  }

  let contact = await Contact.findOne({ user: user._id, email }).sort({ updatedAt: -1 })
  if (contact) {
    if (firstName) contact.firstName = firstName
    if (lastName) contact.lastName = lastName
    if (name) contact.name = name
    if (!contact.phone && phone) contact.phone = phone
    contact.jobStatus = 'open'
    contact.completedAt = undefined
    contact.source = contact.source || 'booking'
    contact.dealLog = [...(contact.dealLog || []), logEntry].slice(-40)
    await contact.save()
  } else {
    contact = await Contact.create({
      user: user._id,
      firstName,
      lastName,
      name,
      email,
      phone,
      kind: 'prospect',
      source: 'booking',
      activity: service.name,
      notes: message,
      dealLog: [logEntry],
    })
  }

  let appointment
  try {
    appointment = await Appointment.create({
      user: user._id,
      contact: contact._id,
      title: `${service.name} — ${name}`.slice(0, 120),
      startAt,
      durationMinutes: service.durationMinutes,
      notes: message || 'Prise de rendez-vous depuis nolyo.fr',
      source: 'booking',
      kind: 'quote',
      service: service._id,
      serviceName: service.name,
      servicePrice: 0,
    })
  } catch (err) {
    if (isDuplicateKey(err) || (await hasOverlap(user._id, startAt, service.durationMinutes))) {
      return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
    }
    throw err
  }

  res.status(201).json({
    appointment: {
      startAt: appointment.startAt,
      durationMinutes: appointment.durationMinutes,
      serviceName: appointment.serviceName,
      kind: appointment.kind,
    },
    guest: { firstName, lastName, name },
    host: { name: user.name },
  })
})

module.exports = router
module.exports.RESERVED = RESERVED
