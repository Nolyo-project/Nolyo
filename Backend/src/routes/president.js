const express = require('express')
const SubscriptionRequest = require('../models/SubscriptionRequest')
const AccountDeletionRequest = require('../models/AccountDeletionRequest')
const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const Service = require('../models/Service')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const { requireAuth, requirePresident } = require('../middleware/auth')
const { ensureInviteCode } = require('../utils/inviteCode')
const { sendInviteCode } = require('../utils/emails')
const { deleteMemberAccount } = require('../utils/deleteAccount')
const { hasOverlap, isDuplicateKey } = require('../utils/overlap')
const { listInvoicesForUser, downloadInvoicePdf } = require('../utils/stripe')
const { COTISATION_RATE, SOCIAL_RATE, VERSEMENT_LIBERATOIRE_RATE, CFP_RATE, ACTIVITY_LABEL, URSSAF_PAY_URL } = require('../config/founderTax')

const SiteReview = require('../models/SiteReview')
const { presidentSiteReview } = require('../utils/siteReviews')

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

async function requestWithAvatar(request) {
  const json = request.toPresidentJSON()
  const linked = request.user
    ? await User.findById(request.user).select('avatar')
    : await User.findOne({ email: String(request.email || '').toLowerCase(), role: 'member' }).select('avatar')
  json.avatar = linked?.avatar || ''
  return json
}

function endOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function appointmentEndsAt(appointment) {
  const start = new Date(appointment.startAt).getTime()
  const minutes = Number(appointment.durationMinutes) || 30
  return new Date(start + minutes * 60000)
}

async function emailBecameNolyoClient(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return false
  const [member, request] = await Promise.all([
    User.findOne({ email: normalized, role: 'member' }).select('_id'),
    SubscriptionRequest.findOne({
      email: normalized,
      status: { $in: ['paid', 'code_issued', 'registered'] },
    }).select('_id'),
  ])
  return Boolean(member || request)
}

async function enrichAppointmentOutcome(appointment) {
  const plain = appointment.toObject ? appointment.toObject() : appointment
  const email = plain.contact?.email || ''
  const matched = await emailBecameNolyoClient(email)
  const manual = plain.clientOutcome || 'none'
  const converted = manual === 'converted' || (manual === 'none' && matched)
  return {
    ...plain,
    endsAt: appointmentEndsAt(plain),
    matchedClient: matched,
    isConverted: converted,
    conversionLabel:
      manual === 'converted'
        ? 'Transformé en client'
        : manual === 'not_converted'
          ? 'Non transformé'
          : matched
            ? 'Transformé en client'
            : 'En attente',
  }
}

const router = express.Router()

router.use(requireAuth, requirePresident)

router.get('/requests', async (_req, res) => {
  const { DEMO_EMAILS } = require('../seed/demoMember')
  const demoSet = new Set(DEMO_EMAILS.map((email) => String(email).toLowerCase()))
  const requests = (await SubscriptionRequest.find().sort({ createdAt: -1 })).filter(
    (item) => !demoSet.has(String(item.email || '').toLowerCase()),
  )
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

  const emails = [...new Set(requests.map((item) => String(item.email || '').toLowerCase()).filter(Boolean))]
  const userIds = requests.map((item) => item.user).filter(Boolean)
  const users = await User.find({
    $or: [
      ...(userIds.length ? [{ _id: { $in: userIds } }] : []),
      ...(emails.length ? [{ email: { $in: emails }, role: 'member' }] : []),
    ],
  }).select('_id email avatar')

  const byId = new Map(users.map((user) => [String(user._id), user]))
  const byEmail = new Map(users.map((user) => [String(user.email).toLowerCase(), user]))

  res.json({
    counts,
    requests: requests.map((item) => {
      const json = item.toPresidentJSON()
      const linked =
        (item.user && byId.get(String(item.user))) || byEmail.get(String(item.email || '').toLowerCase()) || null
      json.avatar = linked?.avatar || ''
      return json
    }),
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

  res.json({ request: await requestWithAvatar(request) })
})

router.post('/requests/:id/confirm-payment', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  if (request.status !== 'quote_sent') {
    return res.status(400).json({
      error: 'Confirmez d’abord l’envoi du devis, puis le retour du devis signé.',
    })
  }

  request.status = 'paid'
  request.paidAt = new Date()
  await ensureInviteCode(request)
  request.status = 'code_issued'
  await request.save()
  sendInviteCode(request).catch((err) => console.error('Mail code', err.message))

  res.json({ request: await requestWithAvatar(request) })
})

router.post('/requests/:id/issue-code', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable.' })
  }

  if (request.status !== 'paid' && request.status !== 'code_issued' && request.status !== 'quote_sent') {
    return res.status(400).json({
      error: 'Le devis signé doit être reçu avant de délivrer un code.',
    })
  }

  await ensureInviteCode(request)
  request.status = 'code_issued'
  await request.save()
  sendInviteCode(request).catch((err) => console.error('Mail code', err.message))

  res.json({ request: await requestWithAvatar(request) })
})

router.post('/requests/:id/flag-issue', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
  const note = String(req.body?.note || '').trim().slice(0, 500)
  if (note.length < 2) return res.status(400).json({ error: 'Décrivez le problème.' })
  request.issueNote = note
  request.issueAt = new Date()
  await request.save()
  res.json({ request: await requestWithAvatar(request) })
})

router.post('/requests/:id/clear-issue', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
  request.issueNote = ''
  request.issueAt = undefined
  await request.save()
  res.json({ request: await requestWithAvatar(request) })
})

router.delete('/requests/:id', async (req, res) => {
  const request = await SubscriptionRequest.findById(req.params.id)
  if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
  if (request.status === 'registered' && request.user) {
    return res.status(400).json({
      error: 'Cette demande est liée à un compte. Supprimez le membre plutôt que la demande.',
    })
  }
  await request.deleteOne()
  res.json({ ok: true, id: String(req.params.id) })
})

router.get('/members', async (_req, res) => {
  const { DEMO_EMAILS } = require('../seed/demoMember')
  const users = await User.find({
    role: 'member',
    email: { $nin: DEMO_EMAILS },
  }).sort({ createdAt: -1 })
  const members = users.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.business?.phone || user.page?.phone || '',
    avatar: user.avatar || '',
    company: user.subscription?.company || user.onboarding?.company || user.business?.tradeName || '',
    plan: user.subscription?.plan || '',
    status: user.subscription?.status || 'none',
    billing: {
      trialEndsAt: user.subscription?.trialEndsAt || null,
      paidAt: user.subscription?.paidAt || null,
      currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
      nextInvoiceAt: user.subscription?.nextInvoiceAt || user.subscription?.trialEndsAt || user.subscription?.currentPeriodEnd || null,
      stripe: Boolean(user.subscription?.stripeCustomerId),
      hasPaymentMethod: Boolean(user.subscription?.hasPaymentMethod),
      billingChoice: user.subscription?.billingChoice || '',
      collectionMethod: user.subscription?.collectionMethod || '',
      autoDebit:
        user.subscription?.collectionMethod === 'charge_automatically' &&
        Boolean(user.subscription?.hasPaymentMethod),
    },
    slug: user.page?.slug || '',
    published: Boolean(user.page?.published && user.page?.slug),
    city: user.onboarding?.city || '',
    trade: user.onboarding?.tradeLabel || user.onboarding?.trade || '',
    activatedAt: user.subscription?.activatedAt || null,
    upgradedToProAt: user.subscription?.upgradedToProAt || null,
    upgradeCharged: Boolean(user.subscription?.upgradeCharged),
    planHistory: Array.isArray(user.subscription?.planHistory)
      ? user.subscription.planHistory.map((entry) => ({
          plan: entry.plan,
          from: entry.from || null,
          to: entry.to || null,
          note: entry.note || '',
        }))
      : [],
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

router.get('/members/:id/invoices', async (req, res) => {
  const member = await User.findOne({ _id: req.params.id, role: 'member' })
  if (!member) return res.status(404).json({ error: 'Membre introuvable.' })
  try {
    const invoices = await listInvoicesForUser(member)
    res.json({ invoices })
  } catch (err) {
    console.error('Member invoices', err.message)
    res.status(502).json({ error: 'Impossible de récupérer les factures Stripe.' })
  }
})

router.get('/members/:id/invoices/:invoiceId/download', async (req, res) => {
  const member = await User.findOne({ _id: req.params.id, role: 'member' })
  if (!member) return res.status(404).json({ error: 'Membre introuvable.' })
  try {
    const file = await downloadInvoicePdf(member, req.params.invoiceId)
    if (!file) return res.status(404).json({ error: 'Facture introuvable.' })
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
    res.send(file.buffer)
  } catch (err) {
    console.error('Member invoice download', err.message)
    res.status(502).json({ error: 'Téléchargement de la facture impossible.' })
  }
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
  res.json({ request: await requestWithAvatar(request) })
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
  res.json({ request: await requestWithAvatar(request) })
})

router.get('/badges', async (req, res) => {
  const now = new Date()
  const in14 = new Date(Date.now() + 14 * 86400000)
  const [rdv, upcoming, testimonials, requestsReceived, deletionsPending] = await Promise.all([
    Appointment.countDocuments({
      user: req.user._id,
      status: 'planned',
      startAt: { $gte: startOfDay(), $lte: endOfDay() },
    }),
    Appointment.countDocuments({
      user: req.user._id,
      status: 'planned',
      startAt: { $gte: now, $lte: in14 },
    }),
    SiteReview.countDocuments({ status: 'pending' }),
    SubscriptionRequest.countDocuments({ status: 'received' }),
    AccountDeletionRequest.countDocuments({ status: 'pending' }),
  ])
  res.json({
    badges: {
      rdv,
      upcoming,
      testimonials,
      requests: requestsReceived,
      deletions: deletionsPending,
      inbox: requestsReceived + deletionsPending + testimonials,
    },
  })
})

router.get('/testimonials', async (req, res) => {
  const filter = {}
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) {
    filter.status = req.query.status
  }
  const reviews = await SiteReview.find(filter).sort({ createdAt: -1 }).limit(120)
  res.json({ reviews: reviews.map(presidentSiteReview) })
})

router.patch('/testimonials/:id', async (req, res) => {
  const review = await SiteReview.findById(req.params.id)
  if (!review) return res.status(404).json({ error: 'Avis introuvable.' })
  if (['pending', 'approved', 'rejected'].includes(req.body?.status)) {
    review.status = req.body.status
  }
  await review.save()
  res.json({ review: presidentSiteReview(review) })
})

router.delete('/testimonials/:id', async (req, res) => {
  const review = await SiteReview.findByIdAndDelete(req.params.id)
  if (!review) return res.status(404).json({ error: 'Avis introuvable.' })
  res.json({ ok: true })
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
  if (['none', 'converted', 'not_converted'].includes(req.body?.clientOutcome)) {
    appointment.clientOutcome = req.body.clientOutcome
    appointment.clientOutcomeAt = req.body.clientOutcome === 'none' ? undefined : new Date()
  }
  if (appointment.status === 'planned') {
    if (req.body?.startAt && appointment.startAt.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Choisissez un créneau encore à venir.' })
    }
    if (await hasOverlap(req.user._id, appointment.startAt, appointment.durationMinutes || 30, appointment._id)) {
      return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
    }
  }
  await appointment.save()
  await appointment.populate('contact', 'name firstName lastName phone email kind company')
  const enriched = await enrichAppointmentOutcome(appointment)
  res.json({ appointment: enriched })
})

router.get('/appointment-outcomes', async (req, res) => {
  const now = new Date()
  const appointments = await Appointment.find({
    user: req.user._id,
    status: { $ne: 'cancelled' },
  })
    .sort({ startAt: -1 })
    .populate('contact', 'name firstName lastName phone email kind company')
    .limit(200)

  const ended = []
  for (const item of appointments) {
    const endsAt = appointmentEndsAt(item)
    if (endsAt > now && item.status !== 'done') continue
    ended.push(await enrichAppointmentOutcome(item))
  }

  const converted = ended.filter((item) => item.isConverted)
  const pending = ended.filter((item) => !item.isConverted && item.clientOutcome !== 'not_converted')

  res.json({
    counts: {
      ended: ended.length,
      converted: converted.length,
      pending: pending.length,
    },
    ended,
    converted,
  })
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
  const cotisationEstimate = Math.round(income * COTISATION_RATE * 100) / 100
  const socialEstimate = Math.round(income * SOCIAL_RATE * 100) / 100
  const versementLiberatoireEstimate = Math.round(income * VERSEMENT_LIBERATOIRE_RATE * 100) / 100
  const cfpEstimate = Math.round(income * CFP_RATE * 100) / 100
  const afterCotisation = Math.round((income - cotisationEstimate) * 100) / 100
  const today = new Date()
  const reminderDay = today.getDate() >= 5
  res.json({
    transactions,
    totals: {
      income,
      expense,
      balance: Math.round((income - expense) * 100) / 100,
      cotisationEstimate,
      cotisationRate: COTISATION_RATE,
      socialRate: SOCIAL_RATE,
      socialEstimate,
      versementLiberatoireRate: VERSEMENT_LIBERATOIRE_RATE,
      versementLiberatoireEstimate,
      cfpRate: CFP_RATE,
      cfpEstimate,
      activityLabel: ACTIVITY_LABEL,
      afterCotisation,
      netAfterCotisation: Math.round((afterCotisation - expense) * 100) / 100,
    },
    urssaf: {
      payUrl: URSSAF_PAY_URL,
      reminderActive: reminderDay,
      reminderLabel: reminderDay
        ? 'Pensez à déclarer et payer vos cotisations URSSAF (rappel du 5).'
        : 'Rappel URSSAF chaque mois à partir du 5.',
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

router.get('/analytics', async (req, res) => {
  const AnalyticsEvent = require('../models/AnalyticsEvent')
  const SubscriptionRequest = require('../models/SubscriptionRequest')
  const SiteReview = require('../models/SiteReview')
  const AccountDeletionRequest = require('../models/AccountDeletionRequest')
  const { DEMO_EMAILS } = require('../seed/demoMember')
  const { startOfDaysAgo } = require('../utils/analytics')

  const range = String(req.query.range || '30')
  const days = range === '7' ? 7 : range === '90' ? 90 : 30
  const since = startOfDaysAgo(days - 1)
  const prevSince = startOfDaysAgo(days * 2 - 1)
  const prevUntil = since
  const now = new Date()

  const memberFilter = {
    role: 'member',
    email: { $nin: DEMO_EMAILS },
  }

  const [
    pageViews,
    pageViewsPrev,
    uniqueSessions,
    previews,
    previewsPrev,
    requests,
    requestsPrev,
    requestsAllTime,
    membersCreated,
    membersByPlan,
    membersByStatus,
    membersByTrade,
    reviewsApproved,
    reviewsPending,
    reviewsPeriod,
    deletionsPending,
    deletionsAccepted,
    founderRdvPeriod,
    founderRdvConverted,
    founderRdvPending,
    topPaths,
    topSources,
    dailyViews,
    dailyPreviews,
    dailyRequests,
    conversionTimes,
    subscribePageViews,
  ] = await Promise.all([
    AnalyticsEvent.countDocuments({ type: 'page_view', createdAt: { $gte: since } }),
    AnalyticsEvent.countDocuments({ type: 'page_view', createdAt: { $gte: prevSince, $lt: prevUntil } }),
    AnalyticsEvent.distinct('sessionId', {
      type: 'page_view',
      createdAt: { $gte: since },
      sessionId: { $nin: ['', null] },
    }),
    AnalyticsEvent.aggregate([
      { $match: { type: 'preview_start', createdAt: { $gte: since } } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.countDocuments({ type: 'preview_start', createdAt: { $gte: prevSince, $lt: prevUntil } }),
    SubscriptionRequest.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          essentiel: { $sum: { $cond: [{ $eq: ['$plan', 'essentiel'] }, 1, 0] } },
          pro: { $sum: { $cond: [{ $eq: ['$plan', 'pro'] }, 1, 0] } },
          registered: { $sum: { $cond: [{ $eq: ['$status', 'registered'] }, 1, 0] } },
          quote_sent: { $sum: { $cond: [{ $eq: ['$status', 'quote_sent'] }, 1, 0] } },
          code_issued: { $sum: { $cond: [{ $eq: ['$status', 'code_issued'] }, 1, 0] } },
          received: { $sum: { $cond: [{ $eq: ['$status', 'received'] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        },
      },
    ]),
    SubscriptionRequest.countDocuments({ createdAt: { $gte: prevSince, $lt: prevUntil } }),
    SubscriptionRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    User.countDocuments({ ...memberFilter, createdAt: { $gte: since } }),
    User.aggregate([
      { $match: memberFilter },
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: memberFilter },
      { $group: { _id: '$subscription.status', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      {
        $match: {
          ...memberFilter,
          'onboarding.tradeLabel': { $exists: true, $nin: ['', null] },
        },
      },
      { $group: { _id: '$onboarding.tradeLabel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    SiteReview.countDocuments({ status: 'approved' }),
    SiteReview.countDocuments({ status: 'pending' }),
    SiteReview.countDocuments({ status: 'approved', createdAt: { $gte: since } }),
    AccountDeletionRequest.countDocuments({ status: 'pending' }),
    AccountDeletionRequest.countDocuments({ status: 'accepted', createdAt: { $gte: since } }),
    Appointment.countDocuments({
      user: req.user._id,
      status: { $ne: 'cancelled' },
      startAt: { $gte: since },
    }),
    Appointment.countDocuments({
      user: req.user._id,
      status: { $ne: 'cancelled' },
      clientOutcome: 'converted',
      startAt: { $gte: since },
    }),
    Appointment.countDocuments({
      user: req.user._id,
      status: { $ne: 'cancelled' },
      startAt: { $lt: now },
      $or: [{ clientOutcome: { $exists: false } }, { clientOutcome: 'none' }],
    }),
    AnalyticsEvent.aggregate([
      { $match: { type: 'page_view', createdAt: { $gte: since }, path: { $ne: '' } } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { type: 'page_view', createdAt: { $gte: since } } },
      { $group: { _id: { $ifNull: ['$source', 'direct'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { type: 'page_view', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { type: 'preview_start', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SubscriptionRequest.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SubscriptionRequest.aggregate([
      {
        $match: {
          registeredAt: { $exists: true, $ne: null },
          createdAt: { $gte: since },
        },
      },
      {
        $project: {
          days: {
            $divide: [{ $subtract: ['$registeredAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$days' },
          count: { $sum: 1 },
        },
      },
    ]),
    AnalyticsEvent.countDocuments({
      type: 'page_view',
      createdAt: { $gte: since },
      path: { $regex: '^/abonnement' },
    }),
  ])

  const previewMap = Object.fromEntries(previews.map((row) => [row._id || 'pro', row.count]))
  const previewEssentiel = previewMap.essentiel || 0
  const previewPro = previewMap.pro || 0
  const previewTotal = previewEssentiel + previewPro
  const reqStats = requests[0] || {
    total: 0,
    essentiel: 0,
    pro: 0,
    registered: 0,
    quote_sent: 0,
    code_issued: 0,
    received: 0,
    paid: 0,
  }
  const pipelineAll = Object.fromEntries(requestsAllTime.map((row) => [row._id, row.count]))

  const planMembers = Object.fromEntries(membersByPlan.map((row) => [row._id || '—', row.count]))
  const statusMembers = Object.fromEntries(membersByStatus.map((row) => [row._id || 'none', row.count]))
  const membersTotal = Object.values(statusMembers).reduce((sum, n) => sum + Number(n || 0), 0)

  function delta(current, previous) {
    if (!previous) return current ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  function rate(part, whole) {
    if (!whole) return 0
    return Math.round((part / whole) * 1000) / 10
  }

  const sessions = uniqueSessions.length
  const avgConversionDays = conversionTimes[0]?.avgDays
  const conversionSample = conversionTimes[0]?.count || 0

  res.json({
    range: days,
    since,
    kpis: {
      pageViews: { value: pageViews, prev: pageViewsPrev, delta: delta(pageViews, pageViewsPrev) },
      sessions: sessions,
      previews: { value: previewTotal, prev: previewsPrev, delta: delta(previewTotal, previewsPrev) },
      previewEssentiel,
      previewPro,
      requests: { value: reqStats.total, prev: requestsPrev, delta: delta(reqStats.total, requestsPrev) },
      requestsEssentiel: reqStats.essentiel,
      requestsPro: reqStats.pro,
      registered: reqStats.registered,
      membersNew: membersCreated,
      reviews: reviewsPeriod,
      subscribeViews: subscribePageViews,
      founderRdv: founderRdvPeriod,
    },
    rates: {
      previewToRequest: rate(reqStats.total, previewTotal),
      requestToRegistered: rate(reqStats.registered, reqStats.total),
      viewToPreview: rate(previewTotal, pageViews),
      viewToSubscribe: rate(subscribePageViews, pageViews),
      avgDaysToRegister: avgConversionDays != null ? Math.round(avgConversionDays * 10) / 10 : null,
      conversionSample,
    },
    funnel: {
      received: reqStats.received,
      quote_sent: reqStats.quote_sent,
      paid: reqStats.paid,
      code_issued: reqStats.code_issued,
      registered: reqStats.registered,
      total: reqStats.total,
    },
    pipelineAll: {
      received: pipelineAll.received || 0,
      quote_sent: pipelineAll.quote_sent || 0,
      paid: pipelineAll.paid || 0,
      code_issued: pipelineAll.code_issued || 0,
      registered: pipelineAll.registered || 0,
    },
    members: {
      total: membersTotal,
      essentiel: planMembers.essentiel || 0,
      pro: planMembers.pro || 0,
      active: statusMembers.active || 0,
      trialing: statusMembers.trialing || 0,
      past_due: statusMembers.past_due || 0,
      unpaid: statusMembers.unpaid || 0,
      canceled: statusMembers.canceled || 0,
      incomplete: statusMembers.incomplete || 0,
    },
    trades: membersByTrade.map((row) => ({ label: row._id, count: row.count })),
    reviews: {
      approved: reviewsApproved,
      pending: reviewsPending,
      newInPeriod: reviewsPeriod,
    },
    deletions: {
      pending: deletionsPending,
      acceptedInPeriod: deletionsAccepted,
    },
    founderBookings: {
      inPeriod: founderRdvPeriod,
      converted: founderRdvConverted,
      outcomePending: founderRdvPending,
    },
    topPaths: topPaths.map((row) => ({ path: row._id, count: row.count })),
    topSources: topSources.map((row) => ({ source: row._id || 'direct', count: row.count })),
    series: {
      views: dailyViews.map((row) => ({ day: row._id, count: row.count })),
      previews: dailyPreviews.map((row) => ({ day: row._id, count: row.count })),
      requests: dailyRequests.map((row) => ({ day: row._id, count: row.count })),
    },
  })
})

router.get('/site-settings', async (_req, res) => {
  const SiteSettings = require('../models/SiteSettings')
  const settings = await SiteSettings.getSiteSettings()
  res.json({ settings: settings.toAdminJSON() })
})

router.post('/test-mail', async (req, res) => {
  const { sendMail, mailEnabled } = require('../utils/mail')
  const to = String(req.body?.to || req.user.email || '').trim().toLowerCase()
  if (!to) return res.status(400).json({ error: 'Indiquez un e-mail de test.' })
  if (!mailEnabled()) {
    return res.status(503).json({
      error: 'EmailJS non configuré sur ce serveur (EMAILJS_* manquants).',
      mail: 'disabled',
    })
  }
  try {
    await sendMail({
      to,
      subject: `Test Nolyo — ${new Date().toLocaleString('fr-FR')}`,
      text: 'Ceci est un e-mail de test envoyé depuis le serveur Nolyo (Railway / API).',
      html: '<p style="line-height:1.6;margin:0;">Ceci est un e-mail de test envoyé depuis le serveur Nolyo (Railway / API).</p>',
    })
    return res.json({ ok: true, to, message: 'E-mail de test envoyé. Vérifiez EmailJS History et votre boîte.' })
  } catch (err) {
    return res.status(502).json({
      ok: false,
      to,
      error: err?.text || err?.message || 'Échec EmailJS',
      status: err?.status || null,
    })
  }
})

router.patch('/site-settings', async (req, res) => {
  const SiteSettings = require('../models/SiteSettings')
  const { sendMaintenanceNotice } = require('../utils/emails')
  const { DEMO_EMAILS } = require('../seed/demoMember')

  const settings = await SiteSettings.getSiteSettings()
  const mode = String(req.body?.mode || '').trim()
  if (mode && SiteSettings.MODES.includes(mode)) settings.mode = mode

  if (req.body?.title !== undefined) {
    settings.title = String(req.body.title || '').trim().slice(0, 120)
  }
  if (req.body?.message !== undefined) {
    settings.message = String(req.body.message || '').trim().slice(0, 800)
  }

  if (req.body?.clearSchedule) {
    settings.startsAt = null
    settings.endsAt = null
  } else {
    if (req.body?.startsAt !== undefined) {
      if (!req.body.startsAt) settings.startsAt = null
      else {
        const startsAt = parseDate(req.body.startsAt)
        if (!startsAt) return res.status(400).json({ error: 'Date de début invalide.' })
        settings.startsAt = startsAt
      }
    }
    if (req.body?.endsAt !== undefined) {
      if (!req.body.endsAt) settings.endsAt = null
      else {
        const endsAt = parseDate(req.body.endsAt)
        if (!endsAt) return res.status(400).json({ error: 'Date de fin invalide.' })
        settings.endsAt = endsAt
      }
    }
  }

  if (settings.startsAt && settings.endsAt && settings.endsAt < settings.startsAt) {
    return res.status(400).json({ error: 'La fin doit être après le début.' })
  }

  const notify = Boolean(req.body?.notifySubscribers)
  let notified = 0

  if (notify && settings.mode === 'maintenance') {
    const fingerprint = [
      settings.mode,
      settings.startsAt?.toISOString?.() || '',
      settings.endsAt?.toISOString?.() || '',
      settings.message || '',
    ].join('|')

    if (fingerprint !== settings.lastNotifyFingerprint) {
      const members = await User.find({
        role: 'member',
        email: { $nin: DEMO_EMAILS },
        'subscription.status': { $in: ['active', 'trialing'] },
      })
        .select('name email')
        .limit(500)

      const results = await Promise.allSettled(
        members.map((member) =>
          sendMaintenanceNotice(member, {
            startsAt: settings.startsAt,
            endsAt: settings.endsAt,
            message: settings.message,
          }),
        ),
      )
      notified = results.filter((item) => item.status === 'fulfilled').length
      settings.lastNotifiedAt = new Date()
      settings.lastNotifyFingerprint = fingerprint
    }
  }

  await settings.save()
  res.json({ settings: settings.toAdminJSON(), notified })
})

module.exports = router
