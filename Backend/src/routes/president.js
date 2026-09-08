const express = require('express')
const SubscriptionRequest = require('../models/SubscriptionRequest')
const AccountDeletionRequest = require('../models/AccountDeletionRequest')
const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const Service = require('../models/Service')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const { requireAuth, requirePresident } = require('../middleware/auth')
const { createInviteCode } = require('../utils/inviteCode')
const { deleteMemberAccount } = require('../utils/deleteAccount')
const { hasOverlap, isDuplicateKey } = require('../utils/overlap')

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function normalizeTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):([0-5]\d)/)
  if (!match) return ''
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseSchedule(body, current = {}) {
  const fallback = {
    workStart: '09:00',
    workEnd: '18:00',
    durationMinutes: 30,
    workDays: [1, 2, 3, 4, 5],
    ...current,
  }
  const workStart = normalizeTime(body?.workStart || fallback.workStart)
  const workEnd = normalizeTime(body?.workEnd || fallback.workEnd)
  const durationMinutes = Number(body?.durationMinutes ?? fallback.durationMinutes)
  const workDays = Array.isArray(body?.workDays)
    ? [...new Set(body.workDays.map(Number).filter((day) => day >= 0 && day <= 6))].sort()
    : fallback.workDays

  if (!TIME_RE.test(workStart) || !TIME_RE.test(workEnd)) {
    return { error: 'Indiquez des horaires valides (HH:MM).' }
  }
  if (workStart >= workEnd) {
    return { error: 'L’heure de fin doit être après l’heure de début.' }
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
    return { error: 'La durée doit être entre 15 et 240 minutes.' }
  }
  if (!workDays.length) return { error: 'Choisissez au moins un jour.' }
  return { schedule: { workStart, workEnd, durationMinutes, workDays } }
}

async function upsertGuestContact(ownerId, body) {
  if (body?.contact) {
    const existing = await Contact.findOne({ _id: body.contact, user: ownerId })
    if (existing) return existing
  }
  const firstName = String(body?.firstName || '').trim().slice(0, 40)
  const lastName = String(body?.lastName || '').trim().slice(0, 40)
  const name = [firstName, lastName].filter(Boolean).join(' ') || String(body?.name || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()
  const phone = String(body?.phone || '').trim().slice(0, 40)
  if (name.length < 2) return null
  let contact = email ? await Contact.findOne({ user: ownerId, email }).sort({ updatedAt: -1 }) : null
  if (contact) {
    contact.firstName = firstName || contact.firstName
    contact.lastName = lastName || contact.lastName
    contact.name = name
    if (phone && !contact.phone) contact.phone = phone
    await contact.save()
    return contact
  }
  return Contact.create({
    user: ownerId,
    firstName,
    lastName,
    name,
    email,
    phone,
    kind: 'prospect',
    source: 'manual',
    activity: 'Échanger avec Nolyo',
  })
}

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

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

router.post('/requests/:id/flag-issue', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
  const note = String(req.body?.note || '').trim().slice(0, 500)
  if (note.length < 2) return res.status(400).json({ error: 'Décrivez le problème.' })
  request.issueNote = note
  request.issueAt = new Date()
  await request.save()
  res.json({ request: request.toPresidentJSON() })
})

router.post('/requests/:id/clear-issue', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
  request.issueNote = ''
  request.issueAt = undefined
  await request.save()
  res.json({ request: request.toPresidentJSON() })
})

router.get('/members', async (_req, res) => {
  const users = await User.find({ role: 'member' }).sort({ createdAt: -1 })
  const members = users.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.business?.phone || user.page?.phone || '',
    avatar: user.avatar || '',
    company: user.subscription?.company || user.onboarding?.company || user.business?.tradeName || '',
    plan: user.subscription?.plan || '',
    status: user.subscription?.status || 'none',
    slug: user.page?.slug || '',
    published: Boolean(user.page?.published && user.page?.slug),
    city: user.onboarding?.city || '',
    trade: user.onboarding?.tradeLabel || user.onboarding?.trade || '',
    activatedAt: user.subscription?.activatedAt || null,
    createdAt: user.createdAt,
  }))
  res.json({
    counts: {
      total: members.length,
      pro: members.filter((item) => item.plan === 'pro').length,
      essentiel: members.filter((item) => item.plan === 'essentiel').length,
    },
    members,
  })
})

router.get('/deletions', async (_req, res) => {
  const requests = await AccountDeletionRequest.find().sort({ createdAt: -1 })
  const counts = { pending: 0, accepted: 0, refused: 0 }
  for (const item of requests) {
    if (counts[item.status] !== undefined) counts[item.status] += 1
  }
  res.json({
    counts,
    requests: requests.map((item) => item.toPresidentJSON()),
  })
})

router.post('/deletions/:id/accept', async (req, res) => {
  const request = await AccountDeletionRequest.findById(req.params.id)
  if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Cette demande a déjà été traitée.' })
  }

  if (request.user) {
    const member = await User.findById(request.user)
    if (member && member.role !== 'president') {
      await deleteMemberAccount(member)
    }
  }

  request.status = 'accepted'
  request.resolvedAt = new Date()
  await request.save()
  res.json({ request: request.toPresidentJSON() })
})

router.post('/deletions/:id/refuse', async (req, res) => {
  const request = await AccountDeletionRequest.findById(req.params.id)
  if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Cette demande a déjà été traitée.' })
  }

  request.status = 'refused'
  request.refusalNote = String(req.body?.note || '').trim().slice(0, 500)
  request.resolvedAt = new Date()
  await request.save()
  res.json({ request: request.toPresidentJSON() })
})

router.get('/badges', async (req, res) => {
  const rdv = await Appointment.countDocuments({
    user: req.user._id,
    status: 'planned',
    startAt: { $gte: startOfDay(), $lte: endOfDay() },
  })
  res.json({ badges: { rdv } })
})

router.get('/contacts', async (req, res) => {
  const contacts = await Contact.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(200)
  res.json({ contacts })
})

router.patch('/settings', async (req, res) => {
  const parsed = parseSchedule(req.body, req.user.schedule?.toObject?.() || req.user.schedule || {})
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  req.user.schedule = parsed.schedule
  await req.user.save()
  await Service.updateMany(
    { user: req.user._id },
    { $set: { durationMinutes: parsed.schedule.durationMinutes, active: true } },
  )
  res.json({ user: req.user.toSafeJSON() })
})

router.get('/appointments', async (req, res) => {
  const filter = { user: req.user._id }
  if (req.query.from || req.query.to) {
    filter.startAt = {}
    if (req.query.from) filter.startAt.$gte = new Date(req.query.from)
    if (req.query.to) filter.startAt.$lte = new Date(req.query.to)
  }
  const appointments = await Appointment.find(filter)
    .sort({ startAt: 1 })
    .populate('contact', 'name firstName lastName phone email kind company')
    .limit(200)
  res.json({ appointments })
})

router.post('/appointments', async (req, res) => {
  const startAt = parseDate(req.body?.startAt)
  if (!startAt) return res.status(400).json({ error: 'Indiquez une date.' })

  const durationMinutes = Number(req.body?.durationMinutes) || req.user.schedule?.durationMinutes || 30
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
    return res.status(400).json({ error: 'Durée de rendez-vous invalide.' })
  }
  if (startAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Choisissez un créneau encore à venir.' })
  }
  if (await hasOverlap(req.user._id, startAt, durationMinutes)) {
    return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
  }

  const contact = await upsertGuestContact(req.user._id, req.body)
  const title =
    String(req.body?.title || '').trim() ||
    (contact ? `Échanger avec Nolyo — ${contact.name}` : 'Échanger avec Nolyo')
  if (title.length < 2) return res.status(400).json({ error: 'Donnez un titre au rendez-vous.' })

  let appointment
  try {
    appointment = await Appointment.create({
      user: req.user._id,
      title: title.slice(0, 120),
      startAt,
      durationMinutes,
      location: String(req.body?.location || '').trim(),
      notes: String(req.body?.notes || '').trim(),
      contact: contact?._id,
      source: 'manual',
      kind: 'quote',
      serviceName: 'Échanger avec Nolyo',
    })
  } catch (err) {
    if (isDuplicateKey(err) || (await hasOverlap(req.user._id, startAt, durationMinutes))) {
      return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
    }
    throw err
  }
  await appointment.populate('contact', 'name firstName lastName phone email')
  res.status(201).json({ appointment })
})

router.patch('/appointments/:id', async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, user: req.user._id })
  if (!appointment) return res.status(404).json({ error: 'Rendez-vous introuvable.' })
  if (req.body?.title !== undefined) appointment.title = String(req.body.title).trim()
  if (req.body?.location !== undefined) appointment.location = String(req.body.location).trim()
  if (req.body?.notes !== undefined) appointment.notes = String(req.body.notes).trim()
  if (req.body?.startAt) {
    const startAt = parseDate(req.body.startAt)
    if (!startAt) return res.status(400).json({ error: 'Date invalide.' })
    appointment.startAt = startAt
  }
  if (req.body?.durationMinutes !== undefined) {
    const durationMinutes = Number(req.body.durationMinutes)
    if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
      return res.status(400).json({ error: 'Durée de rendez-vous invalide.' })
    }
    appointment.durationMinutes = durationMinutes
  }
  if (['planned', 'done', 'cancelled'].includes(req.body?.status)) appointment.status = req.body.status
  if (appointment.status === 'planned') {
    if (req.body?.startAt && appointment.startAt.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Choisissez un créneau encore à venir.' })
    }
    if (await hasOverlap(req.user._id, appointment.startAt, appointment.durationMinutes || 30, appointment._id)) {
      return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
    }
  }
  await appointment.save()
  await appointment.populate('contact', 'name firstName lastName phone email')
  res.json({ appointment })
})

router.delete('/appointments/:id', async (req, res) => {
  const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!appointment) return res.status(404).json({ error: 'Rendez-vous introuvable.' })
  res.json({ ok: true })
})

function monthBounds(ym) {
  const match = String(ym || '').match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  }
}

router.get('/transactions', async (req, res) => {
  const bounds = monthBounds(req.query.month)
  const filter = { user: req.user._id }
  if (bounds) filter.date = { $gte: bounds.start, $lt: bounds.end }
  const transactions = await Transaction.find(filter).sort({ date: -1 }).limit(bounds ? 400 : 80)
  const income = transactions.filter((t) => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expense = transactions.filter((t) => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0)
  res.json({
    transactions,
    totals: {
      income,
      expense,
      balance: Math.round((income - expense) * 100) / 100,
    },
  })
})

router.post('/transactions', async (req, res) => {
  const label = String(req.body?.label || '').trim()
  const amount = Number(req.body?.amount)
  const date = parseDate(req.body?.date)
  const kind = req.body?.kind === 'expense' ? 'expense' : 'income'
  if (!label) return res.status(400).json({ error: 'Indiquez un libellé.' })
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Montant invalide.' })
  if (!date) return res.status(400).json({ error: 'Indiquez une date.' })
  const transaction = await Transaction.create({
    user: req.user._id,
    kind,
    label,
    amount,
    date,
    category: String(req.body?.category || '').trim(),
  })
  res.status(201).json({ transaction })
})

router.patch('/transactions/:id', async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
  if (!transaction) return res.status(404).json({ error: 'Ligne introuvable.' })
  if (req.body?.label !== undefined) {
    const label = String(req.body.label).trim()
    if (!label) return res.status(400).json({ error: 'Indiquez un libellé.' })
    transaction.label = label
  }
  if (req.body?.amount !== undefined) {
    const amount = Number(req.body.amount)
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Montant invalide.' })
    transaction.amount = amount
  }
  if (req.body?.date !== undefined) {
    const date = parseDate(req.body.date)
    if (!date) return res.status(400).json({ error: 'Date invalide.' })
    transaction.date = date
  }
  if (req.body?.kind === 'expense' || req.body?.kind === 'income') transaction.kind = req.body.kind
  if (req.body?.category !== undefined) transaction.category = String(req.body.category).trim()
  await transaction.save()
  res.json({ transaction })
})

router.delete('/transactions/:id', async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!transaction) return res.status(404).json({ error: 'Ligne introuvable.' })
  res.json({ ok: true })
})

module.exports = router
