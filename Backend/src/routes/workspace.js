const express = require('express')
const mongoose = require('mongoose')
const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const DayLog = require('../models/DayLog')
const InboxItem = require('../models/InboxItem')
const Note = require('../models/Note')
const Reminder = require('../models/Reminder')
const Service = require('../models/Service')
const Transaction = require('../models/Transaction')
const { requireAuth, requireSubscription } = require('../middleware/auth')
const { hasOverlap, isDuplicateKey } = require('../utils/overlap')
const { userHasModule, asksSessionPayment, sessionAmount, parsePaymentMethod, paymentMethodLabel } = require('../data/workspace')

const router = express.Router()
router.use(requireAuth, requireSubscription)

const COTISATION_RATE = 0.22

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

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function requirePro(req, res, next) {
  if (req.user.subscription?.plan !== 'pro') {
    return res.status(403).json({ error: 'Réservé à Nolyo Pro.', code: 'PRO_REQUIRED' })
  }
  next()
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function normalizeTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):([0-5]\d)/)
  if (!match) return ''
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`
}

function defaultSchedule() {
  return {
    workStart: '09:00',
    workEnd: '18:00',
    durationMinutes: 60,
    workDays: [1, 2, 3, 4, 5],
  }
}

function parseSchedule(body, current = {}) {
  const fallback = { ...defaultSchedule(), ...current }
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
    return { error: 'La durée d’un rendez-vous doit être entre 15 et 240 minutes.' }
  }
  if (!workDays.length) {
    return { error: 'Choisissez au moins un jour travaillé.' }
  }

  return { schedule: { workStart, workEnd, durationMinutes, workDays } }
}

router.get('/overview', async (req, res) => {
  const userId = req.user._id
  const todayStart = startOfDay()
  const todayEnd = endOfDay()
  const monthStart = startOfMonth()
  const isPro = req.user.subscription?.plan === 'pro'

  const [
    clients,
    prospects,
    todayAppointments,
    upcomingAppointments,
    monthTx,
    pendingReminders,
    recentNotes,
    unreadInbox,
  ] = await Promise.all([
    Contact.countDocuments({ user: userId, kind: 'client' }),
    Contact.countDocuments({ user: userId, kind: 'prospect' }),
    Appointment.find({
      user: userId,
      status: 'planned',
      startAt: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ startAt: 1 })
      .populate('contact', 'name phone')
      .limit(8),
    Appointment.find({
      user: userId,
      status: 'planned',
      startAt: { $gt: todayEnd },
    })
      .sort({ startAt: 1 })
      .populate('contact', 'name phone')
      .limit(5),
    Transaction.find({ user: userId, date: { $gte: monthStart } }),
    Reminder.find({ user: userId, done: false })
      .sort({ dueAt: 1 })
      .populate('contact', 'name phone')
      .limit(6),
    Note.find({ user: userId }).sort({ createdAt: -1 }).limit(4),
    isPro ? InboxItem.countDocuments({ user: userId, read: false }) : 0,
  ])

  const monthIncome = monthTx.filter((t) => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0)
  const monthExpense = monthTx.filter((t) => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0)

  res.json({
    overview: {
      company: req.user.subscription?.company || '',
      plan: req.user.subscription?.plan,
      clients,
      prospects,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      cotisationEstimate: Math.round(monthIncome * COTISATION_RATE * 100) / 100,
      cotisationRate: COTISATION_RATE,
      pendingReminders: pendingReminders.length,
      unreadInbox,
      todayAppointments,
      upcomingAppointments,
      reminders: pendingReminders,
      recentNotes,
    },
  })
})

router.get('/stats', requirePro, async (req, res) => {
  const userId = req.user._id
  const now = new Date()
  const monthStart = startOfMonth(now)
  const rawShift = Number(req.query.monthsOffset)
  const monthsOffset = Number.isFinite(rawShift) ? Math.max(-60, Math.min(60, Math.round(rawShift))) : 0
  const windowStart = new Date(now.getFullYear(), now.getMonth() + monthsOffset - 5, 1)
  const baselineFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const from = windowStart < baselineFrom ? windowStart : baselineFrom

  const [txs, contacts, bookingAppointments] = await Promise.all([
    Transaction.find({ user: userId, date: { $gte: from } }),
    Contact.find({ user: userId }),
    Appointment.find({ user: userId, source: 'booking', status: { $ne: 'cancelled' } }).select(
      'servicePrice contact startAt',
    ),
  ])

  const clients = contacts.filter((item) => item.kind === 'client' && item.jobStatus !== 'archived')
  const prospects = contacts.filter((item) => item.kind === 'prospect' && item.jobStatus !== 'archived')
  const doneClients = clients.filter((item) => item.jobStatus === 'done').length
  const openClients = clients.filter((item) => item.jobStatus === 'open')
  const quotesSent = clients.filter((item) => resolvedQuoteStatus(item) === 'sent').length
  const quotesSigned = clients.filter((item) => resolvedQuoteStatus(item) === 'signed' || item.jobStatus === 'done').length
  const quotesWaiting = openClients.filter((item) => resolvedQuoteStatus(item) === 'none').length

  let unpaidAmount = 0
  const waitingMoney = []
  for (const contact of openClients) {
    const unpaid = unpaidDeposits(contact.price, contact.depositPlan)
    const due = unpaid.reduce((sum, step) => sum + step.amount, 0)
    if (due > 0) {
      unpaidAmount += due
      waitingMoney.push({
        id: contact._id,
        name: contact.name,
        label: unpaid[0]?.label || 'Acompte',
        amount: due,
        quoteStatus: resolvedQuoteStatus(contact),
      })
    }
  }
  waitingMoney.sort((a, b) => b.amount - a.amount)

  const months = []
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() + monthsOffset - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + monthsOffset - i + 1, 1)
    const monthTx = txs.filter((item) => item.date >= start && item.date < end)
    const income = monthTx.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0)
    months.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      income,
    })
  }

  const monthTx = txs.filter((item) => item.date >= monthStart)
  const monthIncome = monthTx.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0)
  const monthExpense = monthTx.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const prevMonth = months.length >= 2 ? months[months.length - 2].income : 0
  const avgDeal =
    clients.filter((item) => item.price > 0).reduce((sum, item) => sum + item.price, 0) /
    Math.max(1, clients.filter((item) => item.price > 0).length)

  const bookingContacts = contacts.filter((item) => item.source === 'booking')
  const collectedIds = []
  for (const contact of bookingContacts) {
    for (const step of contact.depositPlan || []) {
      if (step.transaction) collectedIds.push(step.transaction)
    }
    if (contact.completionTransaction) collectedIds.push(contact.completionTransaction)
  }
  const collectedTx = collectedIds.length
    ? await Transaction.find({ _id: { $in: collectedIds }, user: userId, kind: 'income' }).select('amount')
    : []

  res.json({
    stats: {
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      lastMonthIncome: prevMonth,
      incomeChange: prevMonth ? Math.round(((monthIncome - prevMonth) / prevMonth) * 100) : null,
      doneClients,
      openClients: openClients.length,
      prospects: prospects.length,
      conversion:
        prospects.length + clients.length
          ? Math.round((clients.length / (clients.length + prospects.length)) * 100)
          : 0,
      quotesWaiting,
      quotesSent,
      quotesSigned,
      unpaidAmount,
      avgDeal: Math.round(avgDeal * 100) / 100,
      waitingMoney: waitingMoney.slice(0, 6),
      months,
      monthsOffset,
      nolio: {
        bookings: bookingAppointments.length,
        newContacts: bookingContacts.length,
        bookedAmount: Math.round(bookingAppointments.reduce((sum, item) => sum + (item.servicePrice || 0), 0) * 100) / 100,
        collectedAmount: Math.round(collectedTx.reduce((sum, item) => sum + (item.amount || 0), 0) * 100) / 100,
      },
    },
  })
})

router.get('/nav-badges', async (req, res) => {
  const userId = req.user._id
  const isPro = req.user.subscription?.plan === 'pro'
  const todayStart = startOfDay()
  const todayEnd = endOfDay()

  const [rdv, reminders, inbox] = await Promise.all([
    Appointment.countDocuments({
      user: userId,
      status: 'planned',
      startAt: { $gte: todayStart, $lte: todayEnd },
    }),
    Reminder.countDocuments({ user: userId, done: false }),
    isPro ? InboxItem.countDocuments({ user: userId, read: false }) : 0,
  ])

  res.json({ badges: { rdv, reminders, inbox } })
})

router.patch('/settings', async (req, res) => {
  const parsed = parseSchedule(req.body, req.user.schedule?.toObject?.() || req.user.schedule || {})
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  req.user.schedule = parsed.schedule
  await req.user.save()
  res.json({ user: req.user.toSafeJSON() })
})

function parseServiceBody(body, previous = {}) {
  const name = String(body?.name ?? previous.name ?? '').trim()
  const kind = body?.kind === 'quote' || (body?.kind === undefined && previous.kind === 'quote') ? 'quote' : 'session'
  const price = Number(body?.price ?? previous.price ?? 0)
  const durationMinutes = Number(body?.durationMinutes ?? previous.durationMinutes ?? 60)
  const active = body?.active === undefined ? previous.active !== false : Boolean(body.active)
  if (name.length < 2) return { error: 'Donnez un nom à la prestation.' }
  if (!Number.isFinite(price) || price < 0) return { error: 'Prix invalide.' }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
    return { error: 'La durée doit être entre 15 et 240 minutes.' }
  }
  return { service: { name: name.slice(0, 80), kind, price: kind === 'quote' && !price ? 0 : price, durationMinutes, active } }
}

router.get('/services', async (req, res) => {
  const services = await Service.find({ user: req.user._id }).sort({ sort: 1, createdAt: 1 }).limit(40)
  res.json({ services })
})

router.post('/services', async (req, res) => {
  const parsed = parseServiceBody(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const count = await Service.countDocuments({ user: req.user._id })
  if (count >= 20) return res.status(400).json({ error: 'Vous avez atteint la limite de 20 prestations.' })
  const service = await Service.create({
    user: req.user._id,
    ...parsed.service,
    sort: count,
  })
  res.status(201).json({ service })
})

router.patch('/services/:id', async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, user: req.user._id })
  if (!service) return res.status(404).json({ error: 'Prestation introuvable.' })
  const parsed = parseServiceBody(req.body, service.toObject())
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  Object.assign(service, parsed.service)
  await service.save()
  res.json({ service })
})

router.delete('/services/:id', async (req, res) => {
  const service = await Service.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!service) return res.status(404).json({ error: 'Prestation introuvable.' })
  res.json({ ok: true })
})

router.get('/contacts', async (req, res) => {
  const kind = req.query.kind === 'client' || req.query.kind === 'prospect' ? req.query.kind : null
  const filter = { user: req.user._id }
  if (kind) filter.kind = kind
  const contacts = await Contact.find(filter).sort({ updatedAt: -1 }).limit(200)
  res.json({ contacts })
})

router.get('/contacts/:id', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })

  const [appointments, notes, reminders] = await Promise.all([
    Appointment.find({ user: req.user._id, contact: contact._id }).sort({ startAt: -1 }).limit(50),
    Note.find({ user: req.user._id, contact: contact._id }).sort({ updatedAt: -1 }).limit(50),
    Reminder.find({ user: req.user._id, contact: contact._id }).sort({ dueAt: -1 }).limit(50),
  ])

  res.json({ contact, appointments, notes, reminders })
})

function parsePrice(value) {
  if (value === undefined || value === null || value === '') return 0
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

function parseServiceLines(value) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return null
  const lines = []
  for (const item of value.slice(0, 20)) {
    const name = String(item?.name || '').trim().slice(0, 80)
    const price = Number(item?.price)
    const quantity = Math.min(20, Math.max(1, Math.round(Number(item?.quantity) || 1)))
    if (name.length < 2 || !Number.isFinite(price) || price < 0) continue
    const line = { name, price, quantity }
    if (item?.service && mongoose.Types.ObjectId.isValid(String(item.service))) {
      line.service = item.service
    }
    lines.push(line)
  }
  return lines
}

function serviceLinesTotal(lines) {
  return Math.round((lines || []).reduce((sum, line) => sum + Number(line.price || 0) * (line.quantity || 1), 0) * 100) / 100
}

function serviceLinesActivity(lines) {
  return (lines || [])
    .map((line) => (line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name))
    .filter(Boolean)
    .join(', ')
    .slice(0, 160)
}

function parseDepositPlan(value, previous = []) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return null
  if (!value.length) return []
  return value.slice(0, 6).map((step, index, list) => {
    const percent = Math.min(100, Math.max(0, Math.round(Number(step?.percent) || 0)))
    const label = String(step?.label || '').trim().slice(0, 40)
    const prev = previous[index] || {}
    const paid = step?.paid !== undefined ? Boolean(step.paid) : Boolean(prev.paid)
    return {
      label: label || (index === 0 ? 'Acompte' : index === list.length - 1 ? 'Solde' : `Échéance ${index + 1}`),
      percent,
      paid,
      paidAt: paid ? step?.paidAt || prev.paidAt || new Date() : undefined,
      transaction: paid ? step?.transaction || prev.transaction || undefined : undefined,
    }
  })
}

function asDepositStep(step) {
  const plain = typeof step?.toObject === 'function' ? step.toObject() : step || {}
  return {
    label: plain.label,
    percent: Number(plain.percent) || 0,
    paid: Boolean(plain.paid),
    paidAt: plain.paidAt,
    transaction: plain.transaction,
  }
}

function splitDepositAmounts(price, steps) {
  const plan =
    Array.isArray(steps) && steps.length
      ? steps.map(asDepositStep)
      : [
          { label: 'Acompte', percent: 30, paid: false },
          { label: 'Solde', percent: 70, paid: false },
        ]
  const cents = Math.round((Number(price) || 0) * 100)
  let allocated = 0
  return plan.map((step, index) => {
    const amountCents =
      index === plan.length - 1 ? Math.max(0, cents - allocated) : Math.round((cents * step.percent) / 100)
    allocated += amountCents
    return { ...step, amount: amountCents / 100 }
  })
}

function unpaidDeposits(price, steps) {
  if (!(Number(price) > 0)) return []
  return splitDepositAmounts(price, steps).filter((step) => step.amount > 0 && !step.paid)
}

function addDealEvent(contact, title, meta = '') {
  if (!Array.isArray(contact.dealLog)) contact.dealLog = []
  contact.dealLog.push({ title, meta, at: new Date() })
  contact.markModified('dealLog')
}

function followUpDueAt(days, schedule) {
  const n = Number(days)
  if (!Number.isFinite(n) || n < 0) return null
  const due = new Date()
  if (n === 0) {
    due.setHours(due.getHours() + 2, 0, 0, 0)
    return due
  }
  due.setDate(due.getDate() + n)
  const [hours, minutes] = String(schedule?.workStart || '09:00').split(':').map(Number)
  due.setHours(hours || 9, minutes || 0, 0, 0)
  return due
}

async function scheduleQuoteReminder(user, contact) {
  const days = user.quoteFollowUpDays === undefined || user.quoteFollowUpDays === null ? 3 : user.quoteFollowUpDays
  const dueAt = followUpDueAt(days, user.schedule)
  if (!dueAt) return null
  const channel = user.quoteFollowUpChannel === 'phone' ? 'phone' : 'email'
  const title = `Relancer le devis — ${contact.name}`
  const existing = await Reminder.findOne({
    user: user._id,
    contact: contact._id,
    kind: 'quote',
    done: false,
  })
  if (existing) {
    existing.title = title
    existing.dueAt = dueAt
    existing.channel = channel
    await existing.save()
    return existing
  }
  return Reminder.create({
    user: user._id,
    contact: contact._id,
    title,
    dueAt,
    channel,
    kind: 'quote',
  })
}

function resolvedQuoteStatus(contact) {
  if (contact.quoteStatus === 'sent' || contact.quoteStatus === 'signed') return contact.quoteStatus
  if ((contact.depositPlan || []).some((step) => step.paid)) return 'signed'
  return contact.quoteStatus || 'none'
}

function resolveContactName(body) {
  const firstName = body?.firstName !== undefined ? String(body.firstName).trim() : ''
  const lastName = body?.lastName !== undefined ? String(body.lastName).trim() : ''
  const composed = [firstName, lastName].filter(Boolean).join(' ')
  const name = composed || String(body?.name || '').trim()
  return { firstName, lastName, name }
}

router.post('/contacts', async (req, res) => {
  const { firstName, lastName, name } = resolveContactName(req.body)
  if (name.length < 2) {
    return res.status(400).json({ error: 'Indiquez un nom.' })
  }
  const price = parsePrice(req.body?.price)
  if (price === null) {
    return res.status(400).json({ error: 'Prix invalide.' })
  }
  const depositPlan = parseDepositPlan(req.body?.depositPlan)
  if (depositPlan === null) {
    return res.status(400).json({ error: 'Acomptes invalides.' })
  }
  const serviceLines = parseServiceLines(req.body?.serviceLines)
  if (serviceLines === null) {
    return res.status(400).json({ error: 'Prestations invalides.' })
  }
  const resolvedLines = serviceLines || []
  const contact = await Contact.create({
    user: req.user._id,
    firstName,
    lastName,
    name,
    email: String(req.body?.email || '').trim().toLowerCase(),
    phone: String(req.body?.phone || '').trim(),
    company: String(req.body?.company || '').trim(),
    activity: String(req.body?.activity || serviceLinesActivity(resolvedLines) || '').trim(),
    kind: req.body?.kind === 'prospect' ? 'prospect' : 'client',
    price: price || (resolvedLines.length ? serviceLinesTotal(resolvedLines) : 0),
    serviceLines: resolvedLines,
    depositPlan: depositPlan || [],
    nextAction: String(req.body?.nextAction || '').trim(),
    notes: String(req.body?.notes || '').trim(),
  })
  res.status(201).json({ contact })
})

router.patch('/contacts/:id', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })

  const fields = ['email', 'phone', 'company', 'activity', 'nextAction', 'notes']
  for (const field of fields) {
    if (req.body?.[field] !== undefined) contact[field] = String(req.body[field]).trim()
  }
  if (req.body?.firstName !== undefined || req.body?.lastName !== undefined) {
    const resolved = resolveContactName({
      firstName: req.body?.firstName !== undefined ? req.body.firstName : contact.firstName,
      lastName: req.body?.lastName !== undefined ? req.body.lastName : contact.lastName,
    })
    if (resolved.name.length < 2) {
      return res.status(400).json({ error: 'Indiquez un nom.' })
    }
    contact.firstName = resolved.firstName
    contact.lastName = resolved.lastName
    contact.name = resolved.name
  } else if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim()
    if (name.length < 2) {
      return res.status(400).json({ error: 'Indiquez un nom.' })
    }
    contact.name = name
    const parts = name.split(/\s+/).filter(Boolean)
    contact.firstName = parts[0] || ''
    contact.lastName = parts.slice(1).join(' ')
  }
  const previousKind = contact.kind
  if (req.body?.kind === 'client' || req.body?.kind === 'prospect') contact.kind = req.body.kind
  if (previousKind === 'prospect' && contact.kind === 'client') {
    contact.jobStatus = 'open'
    contact.completedAt = undefined
  }
  if (req.body?.price !== undefined) {
    const price = parsePrice(req.body.price)
    if (price === null) return res.status(400).json({ error: 'Prix invalide.' })
    contact.price = price
  }
  if (req.body?.serviceLines !== undefined) {
    const serviceLines = parseServiceLines(req.body.serviceLines)
    if (serviceLines === null) return res.status(400).json({ error: 'Prestations invalides.' })
    contact.serviceLines = serviceLines
    if (req.body?.price === undefined) contact.price = serviceLinesTotal(serviceLines)
    if (req.body?.activity === undefined) contact.activity = serviceLinesActivity(serviceLines)
  }
  if (req.body?.depositPlan !== undefined) {
    const depositPlan = parseDepositPlan(req.body.depositPlan, contact.depositPlan)
    if (depositPlan === null) return res.status(400).json({ error: 'Acomptes invalides.' })
    contact.depositPlan = depositPlan
  }
  if (req.body?.quoteStatus === 'none' || req.body?.quoteStatus === 'sent' || req.body?.quoteStatus === 'signed') {
    contact.quoteStatus = req.body.quoteStatus
  }
  await contact.save()
  res.json({ contact })
})

router.patch('/contacts/:id/quote', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })
  if (contact.kind === 'prospect') {
    return res.status(400).json({ error: 'Passez d’abord ce prospect en client.' })
  }
  const status = req.body?.status
  if (status !== 'none' && status !== 'sent' && status !== 'signed') {
    return res.status(400).json({ error: 'Statut de devis invalide.' })
  }
  contact.quoteStatus = status
  if (status === 'sent') {
    contact.quoteSentAt = new Date()
    contact.quoteSignedAt = undefined
    addDealEvent(contact, 'Devis envoyé')
    try {
      await scheduleQuoteReminder(req.user, contact)
    } catch {
      /* la relance ne doit pas bloquer l’envoi du devis */
    }
  } else if (status === 'signed') {
    if (!contact.quoteSentAt) contact.quoteSentAt = new Date()
    contact.quoteSignedAt = new Date()
    addDealEvent(contact, 'Devis signé')
    await Reminder.updateMany(
      { user: req.user._id, contact: contact._id, kind: 'quote', done: false },
      { $set: { done: true } },
    )
  } else {
    contact.quoteSentAt = undefined
    contact.quoteSignedAt = undefined
    addDealEvent(contact, 'Devis réinitialisé')
    await Reminder.deleteMany({ user: req.user._id, contact: contact._id, kind: 'quote', done: false })
  }
  await contact.save()
  res.json({ contact })
})

router.patch('/contacts/:id/deposits/:index', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })
  if (contact.kind === 'prospect') {
    return res.status(400).json({ error: 'Passez d’abord ce prospect en client.' })
  }
  if (Boolean(req.body?.paid) && resolvedQuoteStatus(contact) !== 'signed') {
    return res.status(400).json({ error: 'Faites d’abord signer le devis, puis encaissez.' })
  }
  if (req.body?.depositPlan !== undefined) {
    const parsed = parseDepositPlan(req.body.depositPlan, contact.depositPlan)
    if (parsed === null) return res.status(400).json({ error: 'Acomptes invalides.' })
    contact.depositPlan = parsed
  }
  if (req.body?.price !== undefined) {
    const price = parsePrice(req.body.price)
    if (price === null) return res.status(400).json({ error: 'Prix invalide.' })
    contact.price = price
  }
  if (!contact.depositPlan.length) {
    contact.depositPlan = parseDepositPlan(
      [
        { label: 'Acompte', percent: 30 },
        { label: 'Solde', percent: 70 },
      ],
      [],
    )
  }
  const index = Number(req.params.index)
  const step = contact.depositPlan[index]
  if (!step) return res.status(400).json({ error: 'Échéance introuvable.' })
  const paid = Boolean(req.body?.paid)
  const amount = splitDepositAmounts(contact.price, contact.depositPlan)[index]?.amount || 0

  if (paid && !step.paid) {
    if (amount > 0) {
      const transaction = await Transaction.create({
        user: req.user._id,
        kind: 'income',
        label: `${contact.name} — ${step.label}`,
        amount,
        date: new Date(),
        category: step.label,
      })
      step.transaction = transaction._id
    }
    step.paid = true
    step.paidAt = new Date()
    addDealEvent(contact, `${step.label} payé`, amount ? `${amount.toFixed(2)} €` : '')
  }

  if (!paid && step.paid) {
    if (step.transaction) {
      await Transaction.deleteOne({ _id: step.transaction, user: req.user._id })
    }
    step.paid = false
    step.paidAt = undefined
    step.transaction = undefined
    addDealEvent(contact, `${step.label} annulé`)
  }

  contact.markModified('depositPlan')
  await contact.save()
  res.json({ contact })
})

router.post('/contacts/:id/complete', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })
  if (contact.kind === 'prospect') {
    return res.status(400).json({ error: 'Passez d’abord ce prospect en client.' })
  }
  if (contact.jobStatus === 'archived') {
    return res.status(400).json({ error: 'Ce contact est archivé.' })
  }
  if (contact.jobStatus === 'done') {
    return res.json({ contact, alreadyDone: true })
  }
  if (userHasModule(req.user, 'quotes') && resolvedQuoteStatus(contact) !== 'signed' && contact.price > 0) {
    return res.status(400).json({ error: 'Le devis doit être signé avant de terminer la mission.' })
  }

  if (userHasModule(req.user, 'deposits')) {
    const unpaid = unpaidDeposits(contact.price, contact.depositPlan)
    if (unpaid.length) {
      const names = unpaid.map((step) => step.label).join(', ')
      return res.status(400).json({
        error: `Encore à encaisser : ${names}. Marquez chaque échéance comme payée, puis terminez.`,
      })
    }
  }

  const month = new Date().toLocaleDateString('fr-FR', { month: 'long' })
  const label = `${contact.name} - ${month}`
  let transaction = null
  const alreadyBooked = (contact.depositPlan || []).some((step) => step.transaction)
  if (contact.price > 0 && !alreadyBooked) {
    transaction = await Transaction.create({
      user: req.user._id,
      kind: 'income',
      label,
      amount: contact.price,
      date: new Date(),
      category: 'Mission',
    })
    contact.completionTransaction = transaction._id
  }
  contact.jobStatus = 'done'
  contact.completedAt = new Date()
  addDealEvent(contact, 'Mission terminée')
  await contact.save()
  res.json({ contact, transaction })
})

router.post('/contacts/:id/reopen', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })
  contact.jobStatus = 'open'
  contact.completedAt = undefined
  contact.completionTransaction = undefined
  await contact.save()
  res.json({ contact })
})

router.delete('/contacts/:id', async (req, res) => {
  const contact = await Contact.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })
  res.json({ ok: true })
})

router.get('/appointments', async (req, res) => {
  const filter = { user: req.user._id }
  if (req.query.contact) filter.contact = req.query.contact
  if (req.query.from || req.query.to) {
    filter.startAt = {}
    if (req.query.from) filter.startAt.$gte = new Date(req.query.from)
    if (req.query.to) filter.startAt.$lte = new Date(req.query.to)
  }
  const appointments = await Appointment.find(filter)
    .sort({ startAt: 1 })
    .populate('contact', 'name firstName lastName phone kind company')
    .limit(200)
  res.json({ appointments })
})

router.get('/follow-ups', async (req, res) => {
  const found = await Appointment.find({
    user: req.user._id,
    status: 'planned',
    contact: { $ne: null },
    startAt: { $lte: new Date() },
  })
    .sort({ startAt: -1 })
    .populate('contact', 'name firstName lastName kind company phone price')
    .limit(30)

  const appointments = found.map((item) => {
    const json = item.toObject()
    const contact = json.contact || {}
    const askPayment = asksSessionPayment(req.user, item)
    return {
      ...json,
      askPayment,
      amount: sessionAmount(item, contact),
    }
  })

  res.json({ appointments })
})

router.post('/appointments', async (req, res) => {
  const title = String(req.body?.title || '').trim()
  const startAt = parseDate(req.body?.startAt)
  if (!title) return res.status(400).json({ error: 'Donnez un titre au rendez-vous.' })
  if (!startAt) return res.status(400).json({ error: 'Indiquez une date.' })

  const durationMinutes = Number(req.body?.durationMinutes) || req.user.schedule?.durationMinutes || 60
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
    return res.status(400).json({ error: 'Durée de rendez-vous invalide.' })
  }
  if (startAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Choisissez un créneau encore à venir.' })
  }
  if (await hasOverlap(req.user._id, startAt, durationMinutes)) {
    return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
  }

  let appointment
  try {
    appointment = await Appointment.create({
      user: req.user._id,
      title,
      startAt,
      durationMinutes,
      location: String(req.body?.location || '').trim(),
      notes: String(req.body?.notes || '').trim(),
      contact: req.body?.contact || undefined,
    })
  } catch (err) {
    if (isDuplicateKey(err) || (await hasOverlap(req.user._id, startAt, durationMinutes))) {
      return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
    }
    throw err
  }
  await appointment.populate('contact', 'name phone')
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
    if (await hasOverlap(req.user._id, appointment.startAt, appointment.durationMinutes || 60, appointment._id)) {
      return res.status(409).json({ error: 'Ce créneau n’est plus disponible.' })
    }
  }
  await appointment.save()
  await appointment.populate('contact', 'name phone')
  res.json({ appointment })
})

async function saveAppointmentSessionNote(userId, contact, appointment, raw) {
  const body = String(raw || '').trim()
  if (body.length < 2) return false
  const when = appointment.startAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  await Note.create({
    user: userId,
    title: `RDV du ${when}`.slice(0, 120),
    body: body.slice(0, 4000),
    contact: contact._id,
  })
  appointment.notes = body.slice(0, 1000)
  return true
}

async function markSimpleDepositPaid(contact, transactionId, amount, methodLabel = '') {
  const steps = contact.depositPlan || []
  const unpaid = steps.filter((step) => !step.paid)
  if (unpaid.length !== 1) return false
  unpaid[0].paid = true
  unpaid[0].paidAt = new Date()
  if (transactionId) unpaid[0].transaction = transactionId
  contact.markModified('depositPlan')
  addDealEvent(
    contact,
    `${unpaid[0].label || 'Séance'} payé`,
    [amount ? `${Number(amount).toFixed(2)} €` : '', methodLabel].filter(Boolean).join(' · '),
  )
  return true
}

async function recordUnpaidReminder(user, contact, appointment) {
  if (!userHasModule(user, 'reminders')) return
  const title = `Encaisser ${contact.name}`.slice(0, 160)
  const existing = await Reminder.findOne({
    user: user._id,
    contact: contact._id,
    done: false,
    title,
  })
  if (existing) return
  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + 1)
  const [hours, minutes] = String(user.schedule?.workStart || '09:00').split(':').map(Number)
  dueAt.setHours(hours || 9, minutes || 0, 0, 0)
  await Reminder.create({
    user: user._id,
    contact: contact._id,
    title,
    dueAt,
    channel: 'other',
    kind: 'manual',
  })
}

router.post('/appointments/:id/follow-up', async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, user: req.user._id }).populate('contact')
  if (!appointment) return res.status(404).json({ error: 'Rendez-vous introuvable.' })
  if (!appointment.contact) {
    return res.status(400).json({ error: 'Ce rendez-vous n’est lié à personne.' })
  }

  const contact = await Contact.findOne({ _id: appointment.contact._id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })

  const action = String(req.body?.action || '')
  const noteBody = String(req.body?.note || '').trim()
  const allowed = ['note', 'client', 'archive', 'paid', 'unpaid', 'absent']
  if (!allowed.includes(action)) {
    return res.status(400).json({ error: 'Choisissez une suite : payé, absent, notes, client, ou sans suite.' })
  }
  if (action === 'note' && noteBody.length < 2) {
    return res.status(400).json({ error: 'Écrivez les notes de ce rendez-vous.' })
  }
  if (noteBody.length >= 2) {
    await saveAppointmentSessionNote(req.user._id, contact, appointment, noteBody)
  }

  if (action === 'paid') {
    const fallback = sessionAmount(appointment, contact)
    const parsed = req.body?.amount === undefined || req.body?.amount === '' ? fallback : parsePrice(req.body.amount)
    if (parsed === null) return res.status(400).json({ error: 'Montant invalide.' })
    const method = parsePaymentMethod(req.body?.method)
    if (!method) return res.status(400).json({ error: 'Indiquez le moyen de paiement.' })
    const amount = parsed
    const methodLabel = paymentMethodLabel(method)
    if (contact.kind === 'prospect') contact.kind = 'client'
    appointment.paymentStatus = 'paid'
    appointment.paymentMethod = method
    const when = appointment.startAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const serviceLabel = appointment.serviceName || appointment.title || 'Séance'
    if (amount > 0) {
      const label = [contact.name, serviceLabel].filter(Boolean).join(' — ').slice(0, 120)
      const transaction = await Transaction.create({
        user: req.user._id,
        kind: 'income',
        label,
        amount,
        date: appointment.startAt || new Date(),
        category: serviceLabel,
        method,
      })
      appointment.paymentTransaction = transaction._id
      const marked = await markSimpleDepositPaid(contact, transaction._id, amount, methodLabel)
      if (!marked) {
        addDealEvent(
          contact,
          'Séance payée',
          [serviceLabel, `${amount.toFixed(2)} €`, methodLabel, when].filter(Boolean).join(' · '),
        )
      }
    } else {
      addDealEvent(contact, 'Séance payée', [serviceLabel, methodLabel, when].filter(Boolean).join(' · '))
    }
  } else if (action === 'unpaid') {
    const fallback = sessionAmount(appointment, contact)
    const parsed = req.body?.amount === undefined || req.body?.amount === '' ? fallback : parsePrice(req.body.amount)
    if (parsed === null) return res.status(400).json({ error: 'Montant invalide.' })
    if (contact.kind === 'prospect') contact.kind = 'client'
    appointment.paymentStatus = 'unpaid'
    addDealEvent(
      contact,
      'Séance non payée',
      [appointment.serviceName, parsed > 0 ? `${parsed.toFixed(2)} €` : ''].filter(Boolean).join(' · '),
    )
    await recordUnpaidReminder(req.user, contact, appointment)
  } else if (action === 'absent') {
    if (contact.kind === 'prospect') contact.kind = 'client'
    appointment.paymentStatus = 'absent'
    const when = appointment.startAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    addDealEvent(
      contact,
      'Absent',
      [appointment.serviceName || appointment.title, when].filter(Boolean).join(' · '),
    )
  } else if (action === 'client') {
    contact.kind = 'client'
    contact.jobStatus = 'open'
    contact.completedAt = undefined
  } else if (action === 'archive') {
    contact.jobStatus = 'archived'
    contact.completedAt = new Date()
  }

  await contact.save()
  appointment.status = 'done'
  await appointment.save()
  await appointment.populate('contact', 'name firstName lastName kind company phone jobStatus')
  res.json({ appointment, contact })
})

router.delete('/appointments/:id', async (req, res) => {
  const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!appointment) return res.status(404).json({ error: 'Rendez-vous introuvable.' })
  res.json({ ok: true })
})

function monthBounds(ym) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(ym || ''))
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
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
  const afterCotisation = Math.round((income - cotisationEstimate) * 100) / 100
  res.json({
    transactions,
    totals: {
      income,
      expense,
      balance: income - expense,
      cotisationEstimate,
      cotisationRate: COTISATION_RATE,
      afterCotisation,
      netAfterCotisation: Math.round((afterCotisation - expense) * 100) / 100,
    },
  })
})

router.post('/transactions', async (req, res) => {
  const label = String(req.body?.label || '').trim()
  const amount = Number(req.body?.amount)
  const date = parseDate(req.body?.date)
  const kind = req.body?.kind === 'expense' ? 'expense' : 'income'
  if (kind === 'expense' && req.user.subscription?.plan !== 'pro') {
    return res.status(403).json({ error: 'Les dépenses sont réservées à Nolyo Pro.', code: 'PRO_REQUIRED' })
  }
  if (!label) return res.status(400).json({ error: 'Indiquez un libellé.' })
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'Montant invalide.' })
  }
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
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: 'Montant invalide.' })
    }
    transaction.amount = amount
  }
  if (req.body?.date !== undefined) {
    const date = parseDate(req.body.date)
    if (!date) return res.status(400).json({ error: 'Date invalide.' })
    transaction.date = date
  }
  if (req.body?.kind === 'expense' || req.body?.kind === 'income') {
    if (req.body.kind === 'expense' && req.user.subscription?.plan !== 'pro') {
      return res.status(403).json({ error: 'Les dépenses sont réservées à Nolyo Pro.', code: 'PRO_REQUIRED' })
    }
    transaction.kind = req.body.kind
  }
  if (req.body?.category !== undefined) transaction.category = String(req.body.category).trim()

  await transaction.save()
  res.json({ transaction })
})

router.delete('/transactions/:id', async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!transaction) return res.status(404).json({ error: 'Ligne introuvable.' })
  res.json({ ok: true })
})

router.get('/reminders', async (req, res) => {
  const reminders = await Reminder.find({ user: req.user._id })
    .sort({ done: 1, dueAt: 1 })
    .populate('contact', 'name phone email')
    .limit(80)
  res.json({ reminders })
})

router.post('/reminders', async (req, res) => {
  const title = String(req.body?.title || '').trim()
  const dueAt = parseDate(req.body?.dueAt)
  if (!title) return res.status(400).json({ error: 'Indiquez ce qu’il faut relancer.' })
  if (!dueAt) return res.status(400).json({ error: 'Indiquez une échéance.' })

  const reminder = await Reminder.create({
    user: req.user._id,
    title,
    dueAt,
    channel: ['email', 'phone', 'other'].includes(req.body?.channel) ? req.body.channel : 'email',
    contact: req.body?.contact || undefined,
    kind: req.body?.kind === 'task' || req.body?.kind === 'quote' ? req.body.kind : 'manual',
  })
  await reminder.populate('contact', 'name phone email')
  res.status(201).json({ reminder })
})

router.patch('/reminders/:id', async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user._id })
  if (!reminder) return res.status(404).json({ error: 'Rappel introuvable.' })
  if (req.body?.title !== undefined) reminder.title = String(req.body.title).trim()
  if (req.body?.done !== undefined) reminder.done = Boolean(req.body.done)
  if (req.body?.dueAt) {
    const dueAt = parseDate(req.body.dueAt)
    if (!dueAt) return res.status(400).json({ error: 'Date invalide.' })
    reminder.dueAt = dueAt
  }
  await reminder.save()
  await reminder.populate('contact', 'name phone email')
  res.json({ reminder })
})

router.delete('/reminders/:id', async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!reminder) return res.status(404).json({ error: 'Rappel introuvable.' })
  res.json({ ok: true })
})

router.get('/inbox', requirePro, async (req, res) => {
  const items = await InboxItem.find({ user: req.user._id }).sort({ receivedAt: -1 }).limit(40)
  res.json({ items })
})

router.patch('/inbox/:id', requirePro, async (req, res) => {
  const item = await InboxItem.findOne({ _id: req.params.id, user: req.user._id })
  if (!item) return res.status(404).json({ error: 'Message introuvable.' })
  if (req.body?.read !== undefined) item.read = Boolean(req.body.read)
  await item.save()
  res.json({ item })
})

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function isDateKey(value) {
  return DATE_KEY_RE.test(String(value || ''))
}

function emptyLog(dateKey) {
  return {
    dateKey,
    tasks: [],
    note: '',
    highlight: '',
    tomorrow: '',
    energy: '',
  }
}

function logSummary(log) {
  const tasks = log.tasks || []
  return {
    dateKey: log.dateKey,
    taskCount: tasks.length,
    doneCount: tasks.filter((item) => item.done).length,
    tasks: tasks.map((item) => ({
      _id: item._id,
      title: item.title,
      done: item.done,
    })),
  }
}

router.get('/journal', async (req, res) => {
  const from = String(req.query.from || '')
  const to = String(req.query.to || '')
  if (!isDateKey(from) || !isDateKey(to)) {
    return res.status(400).json({ error: 'Indiquez une période (from / to).' })
  }
  const logs = await DayLog.find({
    user: req.user._id,
    dateKey: { $gte: from, $lte: to },
  }).sort({ dateKey: 1 })
  res.json({ days: logs.map(logSummary) })
})

router.get('/journal/:dateKey', async (req, res) => {
  const dateKey = String(req.params.dateKey || '')
  if (!isDateKey(dateKey)) return res.status(400).json({ error: 'Date invalide.' })
  const log = await DayLog.findOne({ user: req.user._id, dateKey })
  res.json({ log: log || emptyLog(dateKey) })
})

router.put('/journal/:dateKey', async (req, res) => {
  const dateKey = String(req.params.dateKey || '')
  if (!isDateKey(dateKey)) return res.status(400).json({ error: 'Date invalide.' })
  const note = String(req.body?.note || '').trim()
  const highlight = String(req.body?.highlight || '').trim()
  const tomorrow = String(req.body?.tomorrow || '').trim()
  const energy = ['low', 'ok', 'high'].includes(req.body?.energy) ? req.body.energy : ''
  const existing = await DayLog.findOne({ user: req.user._id, dateKey })
  if (!existing && !note && !highlight && !tomorrow && !energy) {
    return res.json({ log: emptyLog(dateKey) })
  }
  const log = await DayLog.findOneAndUpdate(
    { user: req.user._id, dateKey },
    {
      $set: { note, highlight, tomorrow, energy },
      $setOnInsert: { user: req.user._id, dateKey },
    },
    { new: true, upsert: true },
  )
  res.json({ log })
})

router.post('/journal/:dateKey/tasks', async (req, res) => {
  const dateKey = String(req.params.dateKey || '')
  const title = String(req.body?.title || '').trim()
  if (!isDateKey(dateKey)) return res.status(400).json({ error: 'Date invalide.' })
  if (!title) return res.status(400).json({ error: 'Indiquez une tâche.' })
  const log = await DayLog.findOneAndUpdate(
    { user: req.user._id, dateKey },
    {
      $push: { tasks: { title, done: false } },
      $setOnInsert: { user: req.user._id, dateKey },
    },
    { new: true, upsert: true },
  )
  res.status(201).json({ log })
})

router.patch('/journal/:dateKey/tasks/:taskId', async (req, res) => {
  const dateKey = String(req.params.dateKey || '')
  if (!isDateKey(dateKey)) return res.status(400).json({ error: 'Date invalide.' })
  const log = await DayLog.findOne({ user: req.user._id, dateKey })
  if (!log) return res.status(404).json({ error: 'Journal introuvable.' })
  const task = log.tasks.id(req.params.taskId)
  if (!task) return res.status(404).json({ error: 'Tâche introuvable.' })
  if (req.body?.title !== undefined) {
    const title = String(req.body.title).trim()
    if (!title) return res.status(400).json({ error: 'Indiquez une tâche.' })
    task.title = title
  }
  if (req.body?.done !== undefined) task.done = Boolean(req.body.done)
  await log.save()
  res.json({ log })
})

router.delete('/journal/:dateKey/tasks/:taskId', async (req, res) => {
  const dateKey = String(req.params.dateKey || '')
  if (!isDateKey(dateKey)) return res.status(400).json({ error: 'Date invalide.' })
  const log = await DayLog.findOne({ user: req.user._id, dateKey })
  if (!log) return res.status(404).json({ error: 'Journal introuvable.' })
  const task = log.tasks.id(req.params.taskId)
  if (!task) return res.status(404).json({ error: 'Tâche introuvable.' })
  task.deleteOne()
  await log.save()
  res.json({ log })
})

module.exports = router
