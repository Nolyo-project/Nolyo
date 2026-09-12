const express = require('express')
const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const Review = require('../models/Review')
const Service = require('../models/Service')
const SiteReview = require('../models/SiteReview')
const User = require('../models/User')
const { DEMO_EMAILS } = require('../seed/demoMember')
const { listAvailability, resolveSchedule, isValidPublicSlot, isAbsentOn } = require('../utils/bookingSlots')
const { publicAwayInfo } = require('../utils/publicAway')
const { hasOverlap, isDuplicateKey } = require('../utils/overlap')
const { buildPublicSeoPayload, injectSeoIntoHtml } = require('../utils/publicSeo')
const {
  ensureSeedSiteReviews,
  publicSiteReview,
  siteReviewStats,
} = require('../utils/siteReviews')
const { sendBookingEmails } = require('../utils/emails')
const { sendPushToUser } = require('../utils/push')

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
  const kind = item.kind === 'quote' ? 'quote' : item.kind === 'heading' ? 'heading' : 'session'
  return {
    _id: String(item._id),
    name: item.name,
    price: kind === 'heading' ? 0 : item.price,
    durationMinutes: kind === 'heading' ? 0 : item.durationMinutes,
    kind,
    headingId: item.headingId ? String(item.headingId) : null,
  }
}

function publicReview(item) {
  return {
    id: String(item._id),
    authorName: item.authorName,
    rating: item.rating,
    body: item.body,
    createdAt: item.createdAt,
  }
}

function publicAbout(page, user) {
  const about = page.about || { body: '', people: [] }
  const avatar = user.avatar || ''
  const people = (Array.isArray(about.people) ? about.people : [])
    .map((person, index) => ({
      name: person.name || '',
      role: person.role || '',
      bio: person.bio || '',
      photo: person.photo || (index === 0 ? avatar : ''),
    }))
    .filter((person) => person.name || person.photo || person.role || person.bio)

  if (!people.length && (avatar || user.name)) {
    people.push({
      name: user.name || page.title || '',
      role: user.onboarding?.tradeLabel || 'Fondateur',
      bio: '',
      photo: avatar,
    })
  } else if (people[0]) {
    if (!people[0].photo && avatar) people[0].photo = avatar
    if (!people[0].name) people[0].name = user.name || page.title || ''
    if (!people[0].role) people[0].role = people.length === 1 ? user.onboarding?.tradeLabel || 'Fondateur' : people[0].role
  }

  return { body: about.body || '', people }
}

function publicPage(user, extras = {}) {
  const page = User.pickPage(user.page?.toObject?.() || user.page || {})
  const works = [0, 1]
    .map((i) => {
      const image = String(page.photos?.[i] || '').trim()
      const url = websiteUrl(page.workUrls?.[i] || '')
      if (!image && !url) return null
      return { image, url }
    })
    .filter(Boolean)
  const photos = works.map((item) => item.image).filter(Boolean)
  const hasGeo = page.lat != null && page.lng != null
  return {
    title: page.title || user.subscription?.company || user.name,
    description: page.description,
    photos,
    works,
    banner: page.banner || '',
    instagram: socialUrl('instagram', page.instagram),
    facebook: socialUrl('facebook', page.facebook),
    linkedin: socialUrl('linkedin', page.linkedin),
    website: websiteUrl(page.website),
    address: page.address,
    city: page.city,
    postalCode: page.postalCode,
    lat: hasGeo ? page.lat : null,
    lng: hasGeo ? page.lng : null,
    hours: page.hours,
    phone: page.phone,
    email: page.email,
    theme: page.theme,
    about: publicAbout(page, user),
    name: user.name,
    avatar: user.avatar || (page.about?.people || []).find((person) => person?.photo)?.photo || '',
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
  if (requireActive) {
    const { hasWorkspaceAccess } = require('../utils/billing')
    if (!hasWorkspaceAccess(user)) return null
  }
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
  const demoEmails = DEMO_EMAILS.map((email) => String(email).toLowerCase())
  const memberFilter = {
    role: 'member',
    'subscription.status': { $in: ['active', 'trialing'] },
    $and: [
      { email: { $nin: demoEmails } },
      { email: { $not: /@nolio\.test$/i } },
    ],
  }
  const [members, faces] = await Promise.all([
    User.countDocuments(memberFilter),
    User.find(memberFilter)
      .sort({ 'subscription.activatedAt': -1, createdAt: -1 })
      .limit(5)
      .select('name avatar subscription.company onboarding.company business.tradeName'),
  ])

  res.json({
    members,
    faces: faces.map((user) => {
      const company =
        user.subscription?.company ||
        user.onboarding?.company ||
        user.business?.tradeName ||
        user.name ||
        'Nolyo'
      const parts = String(company).trim().split(/\s+/).filter(Boolean)
      const initials = parts
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
      return {
        name: company,
        avatar: user.avatar || '',
        initials: initials || 'N',
      }
    }),
  })
})

/** Données réelles du compte démo pour l’aperçu dashboard sur la landing. */
router.get('/landing-demo', async (_req, res) => {
  try {
    const { ensurePreviewAccount } = require('../seed/demoMember')
    const Reminder = require('../models/Reminder')
    const Transaction = require('../models/Transaction')

    const user = await ensurePreviewAccount('pro')
    if (!user) return res.status(404).json({ error: 'Compte démo introuvable.' })

    const full = await User.findById(user._id)
    if (!full) return res.status(404).json({ error: 'Compte démo introuvable.' })

    const userId = full._id
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)

    const [clients, todayAppointments, pendingReminders, monthTx, upcomingRdv] = await Promise.all([
      Contact.countDocuments({ user: userId, kind: 'client' }),
      Appointment.find({
        user: userId,
        status: 'planned',
        startAt: { $gte: todayStart, $lte: todayEnd },
      })
        .sort({ startAt: 1 })
        .populate('contact', 'name phone')
        .limit(8)
        .lean(),
      Reminder.find({ user: userId, done: false })
        .sort({ dueAt: 1 })
        .populate('contact', 'name phone')
        .limit(6)
        .lean(),
      Transaction.find({ user: userId, date: { $gte: monthStart } }).lean(),
      Appointment.countDocuments({
        user: userId,
        status: 'planned',
        startAt: { $gte: new Date() },
      }),
    ])

    const monthIncome = monthTx.filter((t) => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0)
    const safe = full.toSafeJSON()
    // Pas de secrets Stripe dans l’aperçu public
    if (safe.subscription) {
      delete safe.subscription.stripeCustomerId
      delete safe.subscription.stripeSubscriptionId
    }

    res.json({
      user: safe,
      overview: {
        clients,
        monthIncome,
        pendingReminders: pendingReminders.length,
        todayAppointments,
        reminders: pendingReminders,
      },
      badges: {
        rdv: upcomingRdv,
        reminders: pendingReminders.length,
      },
      pageSlug: full.page?.slug || 'maison-brume',
    })
  } catch (err) {
    console.error('landing-demo', err.message)
    res.status(500).json({ error: 'Aperçu indisponible pour le moment.' })
  }
})

router.get('/site-status', async (_req, res) => {
  try {
    const SiteSettings = require('../models/SiteSettings')
    const settings = await SiteSettings.getSiteSettings()
    res.json({ status: settings.toPublicJSON() })
  } catch (err) {
    console.error('site-status', err.message)
    res.json({
      status: {
        mode: 'live',
        active: false,
        title: '',
        message: '',
        startsAt: null,
        endsAt: null,
      },
    })
  }
})

const trackAttempts = new Map()

function tooManyTracks(ip) {
  const now = Date.now()
  const windowMs = 60 * 1000
  const current = (trackAttempts.get(ip) || []).filter((at) => now - at < windowMs)
  if (current.length >= 60) {
    trackAttempts.set(ip, current)
    return true
  }
  current.push(now)
  trackAttempts.set(ip, current)
  return false
}

router.post('/track', async (req, res) => {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  if (tooManyTracks(ip)) return res.status(204).end()

  const { trackEvent } = require('../utils/analytics')
  const type = String(req.body?.type || '').trim()
  if (type !== 'page_view') return res.status(204).end()

  await trackEvent({
    type: 'page_view',
    path: req.body?.path,
    referrer: req.body?.referrer,
    source: req.body?.source || req.body?.utm_source,
    medium: req.body?.medium || req.body?.utm_medium,
    campaign: req.body?.campaign || req.body?.utm_campaign,
    sessionId: req.body?.sessionId,
  })
  res.status(204).end()
})

const testimonialAttempts = new Map()

function tooManyTestimonials(ip) {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const current = (testimonialAttempts.get(ip) || []).filter((at) => now - at < windowMs)
  if (current.length >= 5) {
    testimonialAttempts.set(ip, current)
    return true
  }
  current.push(now)
  testimonialAttempts.set(ip, current)
  return false
}

router.get('/testimonials', async (_req, res) => {
  await ensureSeedSiteReviews()
  const [reviews, stats] = await Promise.all([
    SiteReview.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(40),
    siteReviewStats(),
  ])
  res.json({
    reviews: reviews.map(publicSiteReview),
    stats,
  })
})

router.post('/testimonials', async (req, res) => {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  if (tooManyTestimonials(ip)) {
    return res.status(429).json({ error: 'Trop d’envois. Réessayez plus tard.' })
  }

  const authorName = String(req.body?.authorName || req.body?.name || '').trim().slice(0, 80)
  const role = String(req.body?.role || '').trim().slice(0, 80)
  const place = String(req.body?.place || '').trim().slice(0, 80)
  const authorEmail = String(req.body?.authorEmail || req.body?.email || '')
    .trim()
    .toLowerCase()
    .slice(0, 120)
  const body = String(req.body?.body || req.body?.text || '').trim().slice(0, 800)
  const rating = Number(req.body?.rating)

  if (authorName.length < 2) return res.status(400).json({ error: 'Indiquez votre nom.' })
  if (body.length < 20) return res.status(400).json({ error: 'Écrivez un avis un peu plus long.' })
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Choisissez une note de 1 à 5.' })
  }
  if (authorEmail && !EMAIL_RE.test(authorEmail)) {
    return res.status(400).json({ error: 'E-mail invalide.' })
  }

  await SiteReview.create({
    authorName,
    role,
    place,
    authorEmail,
    rating,
    body,
    status: 'pending',
  })

  res.status(201).json({
    ok: true,
    message: 'Merci — votre avis sera publié après validation.',
  })
})

router.get('/pages/:slug', async (req, res) => {
  const user = await findPublishedOwner(req.params.slug)
  if (!user) return res.status(404).json({ error: 'Page introuvable.' })

  const [services, reviews, awayInfo] = await Promise.all([
    Service.find({ user: user._id, active: true }).sort({ sort: 1, createdAt: 1 }).limit(40),
    Review.find({ user: user._id, status: 'approved' }).sort({ createdAt: -1 }).limit(40),
    publicAwayInfo(user._id),
  ])
  const bookable = services.filter((item) => item.kind !== 'heading')
  res.json({
    page: publicPage(user, {
      bookingAvailable: bookable.length > 0 && !awayInfo.away,
      ...awayInfo,
      services: services.map(publicService),
      reviews: reviews.map(publicReview),
    }),
  })
})

router.post('/pages/:slug/reviews', async (req, res) => {
  const user = await findPublishedOwner(req.params.slug)
  if (!user) return res.status(404).json({ error: 'Page introuvable.' })

  const authorName = String(req.body?.authorName || '').trim()
  const authorEmail = String(req.body?.authorEmail || '').trim().toLowerCase()
  const body = String(req.body?.body || '').trim()
  const rating = Number(req.body?.rating)

  if (authorName.length < 2) return res.status(400).json({ error: 'Indiquez votre prénom.' })
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Choisissez une note de 1 à 5.' })
  }
  if (body.length < 12) return res.status(400).json({ error: 'Écrivez un avis un peu plus long.' })
  if (authorEmail && !EMAIL_RE.test(authorEmail)) {
    return res.status(400).json({ error: 'E-mail invalide.' })
  }

  const review = await Review.create({
    user: user._id,
    authorName: authorName.slice(0, 80),
    authorEmail: authorEmail.slice(0, 120),
    rating,
    body: body.slice(0, 800),
    status: 'pending',
  })

  res.status(201).json({
    ok: true,
    message: 'Merci — votre avis sera visible après validation.',
    id: String(review._id),
  })
})

router.get('/pages/:slug/booking', async (req, res) => {
  const user = await findPublishedOwner(req.params.slug, { requireActive: true })
  if (!user) return res.status(404).json({ error: 'Page introuvable.' })

  const [services, awayInfo] = await Promise.all([
    Service.find({ user: user._id, active: true }).sort({ sort: 1, createdAt: 1 }).limit(40),
    publicAwayInfo(user._id),
  ])
  const schedule = resolveSchedule(user)
  res.json({
    page: publicPage(user, { ...awayInfo, bookingAvailable: !awayInfo.away }),
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
  if (!service || service.kind === 'heading') return res.status(400).json({ error: 'Choisissez une prestation.' })

  const days = await listAvailability(user, service.durationMinutes, 56)
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
  if (!service || service.kind === 'heading') return res.status(400).json({ error: 'Choisissez une prestation.' })

  const startAt = new Date(req.body?.startAt)
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Choisissez un créneau encore à venir.' })
  }

  const schedule = resolveSchedule(user)
  if (!isValidPublicSlot(startAt, service.durationMinutes, schedule)) {
    return res.status(400).json({ error: 'Ce créneau n’est pas proposé.' })
  }
  if (await isAbsentOn(user._id, startAt)) {
    return res.status(400).json({ error: 'Ce jour n’est pas disponible (absence).' })
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

  const page = publicPage(user)
  sendBookingEmails({
    owner: user,
    contact,
    appointment,
    pageTitle: page.title,
  }).catch((err) => console.error('Booking mail', err.message))

  if (user.notifications?.pushBooking !== false) {
    sendPushToUser(user, {
      title: 'Nouveau rendez-vous',
      body: `${contact.name || 'Un client'} · ${appointment.serviceName} · ${new Date(appointment.startAt).toLocaleString('fr-FR')}`,
      url: '/dashboard/rdv',
    }).catch((err) => console.error('Booking push', err.message))
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
    page: { title: page.title },
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
  const days = await listAvailability(user, service.durationMinutes, 56)
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
  if (await isAbsentOn(user._id, startAt)) {
    return res.status(400).json({ error: 'Ce jour n’est pas disponible (absence).' })
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

  sendBookingEmails({
    owner: user,
    contact,
    appointment,
    pageTitle: 'Nolyo',
    guestConfirm: {
      subject: `Confirmation de rendez-vous — Nolyo`,
      fallbackBody: `Bonjour ${firstName},

Votre rendez-vous avec ${user.name.split(' ')[0] || 'Florentin'} (Nolyo) est confirmé.

Quand : le ${when}
Durée : ${service.durationMinutes} min
Sujet : ${service.name}

Un e-mail de rappel n’est pas obligatoire : ce créneau est déjà dans l’agenda.

À très bientôt,
${user.name.split(' ')[0] || 'Florentin'}
Fondateur de Nolyo`,
    },
  }).catch((err) => console.error('Founder booking mail', err.message))

  if (user.notifications?.pushBooking !== false) {
    sendPushToUser(user, {
      title: 'Nouveau rendez-vous découverte',
      body: `${contact.name || 'Un prospect'} · ${appointment.serviceName} · ${new Date(appointment.startAt).toLocaleString('fr-FR')}`,
      url: '/president',
    }).catch((err) => console.error('Founder booking push', err.message))
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

router.get('/sitemap.xml', async (_req, res) => {
  const origin = String(process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN || 'https://nolyo.fr').replace(/\/$/, '')
  const pages = await User.find({
    role: 'member',
    'page.published': true,
    'page.slug': { $gt: '' },
    'subscription.status': { $in: ['active', 'trialing'] },
  })
    .select('page.slug page.updatedAt updatedAt')
    .limit(5000)

  const staticUrls = ['', '/abonnement', '/rdv'].map(
    (path) => `  <url><loc>${origin}${path || '/'}</loc><changefreq>weekly</changefreq></url>`,
  )
  const pageUrls = pages.flatMap((user) => {
    const slug = user.page.slug
    const lastmod = (user.page?.updatedAt || user.updatedAt || new Date()).toISOString().slice(0, 10)
    return [
      `  <url><loc>${origin}/p/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      `  <url><loc>${origin}/p/${slug}/a-propos</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq></url>`,
      `  <url><loc>${origin}/p/${slug}/reserver</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ]
  })

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...pageUrls].join('\n')}
</urlset>`)
})

router.get('/robots.txt', (_req, res) => {
  const origin = String(process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN || 'https://nolyo.fr').replace(/\/$/, '')
  res.type('text/plain').send(`User-agent: *
Allow: /
Allow: /p/
Disallow: /dashboard
Disallow: /apercu
Disallow: /president
Disallow: /login
Disallow: /inscription
Disallow: /facture
Disallow: /onboarding
Sitemap: ${origin}/sitemap.xml
`)
})

router.get('/seo', async (req, res) => {
  const raw = String(req.query.path || '')
  const match = raw.match(/^\/p\/([a-z0-9-]+)(\/a-propos|\/reserver)?\/?$/)
  if (!match) return res.status(400).json({ error: 'Chemin invalide.' })

  const slug = match[1]
  const pathSuffix = match[2] || ''
  const user = await findPublishedOwner(slug)
  if (!user) return res.status(404).json({ error: 'Page introuvable.' })

  const [services, reviews] = await Promise.all([
    Service.find({ user: user._id, active: true }).sort({ sort: 1, createdAt: 1 }).limit(40),
    Review.find({ user: user._id, status: 'approved' }).sort({ createdAt: -1 }).limit(40),
  ])
  const page = publicPage(user, {
    services: services.map(publicService),
    reviews: reviews.map(publicReview),
  })
  const origin = String(process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN || `${req.protocol}://${req.get('host')}`)
  const seo = buildPublicSeoPayload(page, { origin, slug, pathSuffix })
  res.json({ seo })
})

module.exports = router
module.exports.RESERVED = RESERVED
module.exports.buildPublicSeoPayload = buildPublicSeoPayload
module.exports.injectSeoIntoHtml = injectSeoIntoHtml
