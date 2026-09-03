const express = require('express')
const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const DayLog = require('../models/DayLog')
const InboxItem = require('../models/InboxItem')
const Note = require('../models/Note')
const Reminder = require('../models/Reminder')
const Transaction = require('../models/Transaction')
const { requireAuth, requireSubscription } = require('../middleware/auth')

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
    return res.status(403).json({ error: 'Réservé à Nolio Pro.', code: 'PRO_REQUIRED' })
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

async function hasOverlap(userId, startAt, durationMinutes, excludeId) {
  const endAt = new Date(startAt.getTime() + durationMinutes * 60000)
  const windowStart = new Date(startAt.getTime() - 4 * 60 * 60000)
  const candidates = await Appointment.find({
    user: userId,
    status: 'planned',
    startAt: { $gte: windowStart, $lt: endAt },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
  return candidates.some((item) => {
    const itemEnd = new Date(item.startAt.getTime() + (item.durationMinutes || 60) * 60000)
    return item.startAt < endAt && itemEnd > startAt
  })
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
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [txs, doneClients, prospects] = await Promise.all([
    Transaction.find({ user: userId, date: { $gte: from } }),
    Contact.countDocuments({ user: userId, kind: 'client', jobStatus: 'done' }),
    Contact.countDocuments({ user: userId, kind: 'prospect', jobStatus: { $ne: 'archived' } }),
  ])

  const months = []
  for (let offset = 5; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1)
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

  res.json({
    stats: {
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      doneClients,
      prospects,
      months,
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
  const contact = await Contact.create({
    user: req.user._id,
    firstName,
    lastName,
    name,
    email: String(req.body?.email || '').trim().toLowerCase(),
    phone: String(req.body?.phone || '').trim(),
    company: String(req.body?.company || '').trim(),
    activity: String(req.body?.activity || '').trim(),
    kind: req.body?.kind === 'prospect' ? 'prospect' : 'client',
    price,
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
  if (req.body?.depositPlan !== undefined) {
    const depositPlan = parseDepositPlan(req.body.depositPlan, contact.depositPlan)
    if (depositPlan === null) return res.status(400).json({ error: 'Acomptes invalides.' })
    contact.depositPlan = depositPlan
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
  }

  if (!paid && step.paid) {
    if (step.transaction) {
      await Transaction.deleteOne({ _id: step.transaction, user: req.user._id })
    }
    step.paid = false
    step.paidAt = undefined
    step.transaction = undefined
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

  const unpaid = unpaidDeposits(contact.price, contact.depositPlan)
  if (unpaid.length) {
    const names = unpaid.map((step) => step.label).join(', ')
    return res.status(400).json({
      error: `Encore à encaisser : ${names}. Marquez chaque échéance comme payée, puis terminez.`,
    })
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
  const appointments = await Appointment.find({
    user: req.user._id,
    status: 'planned',
    contact: { $ne: null },
    startAt: { $lte: new Date() },
  })
    .sort({ startAt: -1 })
    .populate('contact', 'name firstName lastName kind company phone')
    .limit(30)

  const due = appointments.filter((item) => {
    const end = new Date(item.startAt.getTime() + (item.durationMinutes || 60) * 60000)
    return end.getTime() <= Date.now()
  })
  res.json({ appointments: due })
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

  const appointment = await Appointment.create({
    user: req.user._id,
    title,
    startAt,
    durationMinutes,
    location: String(req.body?.location || '').trim(),
    notes: String(req.body?.notes || '').trim(),
    contact: req.body?.contact || undefined,
  })
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

router.post('/appointments/:id/follow-up', async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, user: req.user._id }).populate('contact')
  if (!appointment) return res.status(404).json({ error: 'Rendez-vous introuvable.' })
  if (!appointment.contact) {
    return res.status(400).json({ error: 'Ce rendez-vous n’est lié à personne.' })
  }

  const contact = await Contact.findOne({ _id: appointment.contact._id, user: req.user._id })
  if (!contact) return res.status(404).json({ error: 'Contact introuvable.' })

  const action = String(req.body?.action || '')
  if (action === 'client') {
    contact.kind = 'client'
    contact.jobStatus = 'open'
    contact.completedAt = undefined
    await contact.save()
  } else if (action === 'archive') {
    contact.jobStatus = 'archived'
    contact.completedAt = new Date()
    await contact.save()
  } else if (action === 'note') {
    const body = String(req.body?.note || '').trim()
    if (body.length < 2) {
      return res.status(400).json({ error: 'Écrivez une note après ce rendez-vous.' })
    }
    await Note.create({
      user: req.user._id,
      title: `Après RDV — ${contact.name}`,
      body,
      contact: contact._id,
    })
  } else {
    return res.status(400).json({ error: 'Choisissez une suite : client, sans suite, ou note.' })
  }

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

router.get('/transactions', async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 }).limit(80)
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
    return res.status(403).json({ error: 'Les dépenses sont réservées à Nolio Pro.', code: 'PRO_REQUIRED' })
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
      return res.status(403).json({ error: 'Les dépenses sont réservées à Nolio Pro.', code: 'PRO_REQUIRED' })
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
    .populate('contact', 'name phone')
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
  })
  await reminder.populate('contact', 'name phone')
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
  await reminder.populate('contact', 'name phone')
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
