const User = require('../models/User')
const Service = require('../models/Service')

const FOUNDER_SERVICE = 'Échanger avec Nolyo'
const DEFAULT_SCHEDULE = {
  workStart: '09:00',
  workEnd: '18:00',
  durationMinutes: 30,
  workDays: [1, 2, 3, 4, 5],
}

async function ensureFounderBooking(user) {
  if (!user.schedule?.workStart) {
    user.schedule = { ...DEFAULT_SCHEDULE, workDays: [...DEFAULT_SCHEDULE.workDays] }
    await user.save()
  }

  const duration = user.schedule?.durationMinutes || 30
  const existing = await Service.findOne({ user: user._id }).sort({ createdAt: 1 })
  if (existing) {
    let dirty = false
    if (!existing.active) {
      existing.active = true
      dirty = true
    }
    if (existing.durationMinutes !== duration) {
      existing.durationMinutes = duration
      dirty = true
    }
    if (!existing.name) {
      existing.name = FOUNDER_SERVICE
      dirty = true
    }
    if (dirty) await existing.save()
    return
  }

  await Service.create({
    user: user._id,
    name: FOUNDER_SERVICE,
    kind: 'quote',
    price: 0,
    durationMinutes: duration,
    active: true,
  })
}

async function ensurePresident() {
  const email = String(process.env.PRESIDENT_EMAIL || '')
    .trim()
    .toLowerCase()
  const password = String(process.env.PRESIDENT_PASSWORD || '')
  const name = String(process.env.PRESIDENT_NAME || 'Fondateur').trim()

  if (!email || !password) {
    console.warn('PRESIDENT_EMAIL / PRESIDENT_PASSWORD manquants : compte fondateur non créé.')
    return
  }

  let user = await User.findOne({ email })
  if (!user) user = await User.findOne({ role: 'president' })

  if (user) {
    user.email = email
    user.name = name
    user.role = 'president'
    if (!(await user.checkPassword(password))) {
      user.passwordHash = await User.hashPassword(password)
    }
    await user.save()
  } else {
    user = await User.create({
      name,
      email,
      passwordHash: await User.hashPassword(password),
      role: 'president',
      schedule: { ...DEFAULT_SCHEDULE, workDays: [...DEFAULT_SCHEDULE.workDays] },
    })
  }

  await User.updateMany({ role: 'president', _id: { $ne: user._id } }, { $set: { role: 'member' } })
  await ensureFounderBooking(user)
}

module.exports = { ensurePresident, FOUNDER_SERVICE }
