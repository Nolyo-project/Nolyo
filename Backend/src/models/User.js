const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const { workspaceForUser } = require('../data/workspace')

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['essentiel', 'pro'],
    },
    status: {
      type: String,
      enum: ['none', 'active', 'trialing', 'past_due', 'unpaid', 'canceled'],
      default: 'none',
    },
    company: { type: String, trim: true, default: '' },
    teamSize: { type: String, trim: true, default: '' },
    activatedAt: Date,
    trialEndsAt: Date,
    currentPeriodEnd: Date,
    paidAt: Date,
    reminderSentAt: Date,
    invoiceNoticeAt: Date,
    stripeCustomerId: { type: String, trim: true, default: '' },
    stripeSubscriptionId: { type: String, trim: true, default: '' },
    stripePriceId: { type: String, trim: true, default: '' },
    hasPaymentMethod: { type: Boolean, default: false },
    collectionMethod: {
      type: String,
      enum: ['charge_automatically', 'send_invoice', ''],
      default: '',
    },
    nextInvoiceAt: Date,
    /** auto = carte + prélèvement · invoice = payer chaque mois · stop = demande d’arrêt */
    billingChoice: {
      type: String,
      enum: ['auto', 'invoice', 'stop', ''],
      default: '',
    },
    billingChoiceAt: Date,
    billingPromptSeenAt: Date,
    /** Fin des 7 mois (1 offert + 6 engagement) */
    commitmentEndsAt: Date,
    commitmentChoice: {
      type: String,
      enum: ['continue_auto', 'continue_invoice', 'stop', ''],
      default: '',
    },
    commitmentChoiceAt: Date,
    commitmentPromptSeenAt: Date,
    /** Passage Essentiel → Pro (une seule fois). Pas de retour en arrière. */
    upgradedToProAt: Date,
    upgradeCharged: { type: Boolean, default: false },
    planHistory: [
      {
        plan: { type: String, enum: ['essentiel', 'pro'], required: true },
        from: { type: Date, required: true },
        to: { type: Date, default: null },
        note: { type: String, trim: true, default: '', maxlength: 80 },
      },
    ],
  },
  { _id: false },
)

const BUSINESS_DEFAULTS = {
  legalName: '',
  tradeName: '',
  legalForm: '',
  siret: '',
  vatNumber: '',
  apeCode: '',
  rcs: '',
  capital: '',
  address: '',
  addressExtra: '',
  postalCode: '',
  city: '',
  country: 'France',
  phone: '',
  website: '',
  iban: '',
  bic: '',
}

function pickBusiness(source = {}) {
  const next = { ...BUSINESS_DEFAULTS }
  for (const key of Object.keys(BUSINESS_DEFAULTS)) {
    if (source[key] !== undefined && source[key] !== null) {
      next[key] = String(source[key]).trim()
    }
  }
  if (!next.country) next.country = 'France'
  return next
}

const businessSchema = new mongoose.Schema(
  {
    legalName: { type: String, trim: true, default: '', maxlength: 160 },
    tradeName: { type: String, trim: true, default: '', maxlength: 160 },
    legalForm: { type: String, trim: true, default: '', maxlength: 40 },
    siret: { type: String, trim: true, default: '', maxlength: 17 },
    vatNumber: { type: String, trim: true, default: '', maxlength: 20 },
    apeCode: { type: String, trim: true, default: '', maxlength: 10 },
    rcs: { type: String, trim: true, default: '', maxlength: 80 },
    capital: { type: String, trim: true, default: '', maxlength: 40 },
    address: { type: String, trim: true, default: '', maxlength: 160 },
    addressExtra: { type: String, trim: true, default: '', maxlength: 120 },
    postalCode: { type: String, trim: true, default: '', maxlength: 12 },
    city: { type: String, trim: true, default: '', maxlength: 80 },
    country: { type: String, trim: true, default: 'France', maxlength: 80 },
    phone: { type: String, trim: true, default: '', maxlength: 40 },
    website: { type: String, trim: true, default: '', maxlength: 160 },
    iban: { type: String, trim: true, default: '', maxlength: 42 },
    bic: { type: String, trim: true, default: '', maxlength: 14 },
  },
  { _id: false },
)

const DEFAULT_DEPOSIT_PLAN = [
  { label: 'Acompte', percent: 30 },
  { label: 'Solde', percent: 70 },
]

function pickDepositPlan(source) {
  if (!Array.isArray(source) || !source.length) {
    return DEFAULT_DEPOSIT_PLAN.map((step) => ({ ...step }))
  }
  return source.slice(0, 6).map((step, index, list) => {
    const percent = Math.min(100, Math.max(0, Math.round(Number(step?.percent) || 0)))
    const label = String(step?.label || '').trim().slice(0, 40)
    return {
      label: label || (index === 0 ? 'Acompte' : index === list.length - 1 ? 'Solde' : `Échéance ${index + 1}`),
      percent,
    }
  })
}

const depositStepSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '', maxlength: 40 },
    percent: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false },
)

const scheduleSchema = new mongoose.Schema(
  {
    workStart: { type: String, default: '09:00' },
    workEnd: { type: String, default: '18:00' },
    durationMinutes: { type: Number, default: 60, min: 15, max: 240 },
    workDays: { type: [Number], default: () => [1, 2, 3, 4, 5] },
  },
  { _id: false },
)

const workspaceModulesSchema = new mongoose.Schema(
  {
    appointments: Boolean,
    prospects: Boolean,
    quotes: Boolean,
    deposits: Boolean,
    tasks: Boolean,
    notes: Boolean,
    finances: Boolean,
    reminders: Boolean,
    page: Boolean,
    qr: Boolean,
    inbox: Boolean,
    stats: Boolean,
  },
  { _id: false },
)

const workspaceSchema = new mongoose.Schema(
  {
    displayAs: { type: String, enum: ['company', 'person'], default: 'company' },
    modules: { type: workspaceModulesSchema, default: () => ({}) },
  },
  { _id: false },
)

const DEFAULT_THEME = { accent: '#c45c26', background: '#f3eee4', surface: '#ffffff' }

const DEFAULT_PAGE_HOURS = {
  workStart: '09:00',
  workEnd: '18:00',
  workDays: [1, 2, 3, 4, 5],
  note: '',
}

function pageWebsite(value) {
  const raw = String(value || '').trim().slice(0, 240)
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.href.slice(0, 240)
  } catch {
    return ''
  }
}

const PAGE_DEFAULTS = {
  slug: '',
  published: false,
  title: '',
  description: '',
  photos: ['', ''],
  workUrls: ['', ''],
  banner: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  website: '',
  address: '',
  city: '',
  postalCode: '',
  lat: null,
  lng: null,
  phone: '',
  email: '',
  hours: { ...DEFAULT_PAGE_HOURS, workDays: [...DEFAULT_PAGE_HOURS.workDays] },
  theme: { ...DEFAULT_THEME },
  about: { body: '', people: [] },
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function parseHex(value, fallback) {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  let hex = (raw.startsWith('#') ? raw : `#${raw}`).toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : fallback
}

function pickPeople(source) {
  const list = Array.isArray(source) ? source : []
  return list.slice(0, 6).map((person) => ({
    name: String(person?.name || '').trim().slice(0, 80),
    role: String(person?.role || '').trim().slice(0, 80),
    bio: String(person?.bio || '').trim().slice(0, 400),
    photo: String(person?.photo || '').trim().slice(0, 240),
  }))
}

function pickAbout(source = {}) {
  const incoming = source && typeof source === 'object' ? source : {}
  return {
    body: String(incoming.body || '').trim().slice(0, 1200),
    people: pickPeople(incoming.people),
  }
}

function pickTheme(source = {}) {
  const incoming = source && typeof source === 'object' ? source : {}
  return {
    accent: parseHex(incoming.accent, DEFAULT_THEME.accent),
    background: parseHex(incoming.background, DEFAULT_THEME.background),
    surface: parseHex(incoming.surface, DEFAULT_THEME.surface),
  }
}

function pickPageHours(source = {}) {
  const start = String(source?.workStart || DEFAULT_PAGE_HOURS.workStart).trim()
  const end = String(source?.workEnd || DEFAULT_PAGE_HOURS.workEnd).trim()
  const days = Array.isArray(source?.workDays)
    ? source.workDays.map(Number).filter((d) => d >= 0 && d <= 6)
    : [...DEFAULT_PAGE_HOURS.workDays]
  return {
    workStart: /^\d{2}:\d{2}$/.test(start) ? start : DEFAULT_PAGE_HOURS.workStart,
    workEnd: /^\d{2}:\d{2}$/.test(end) ? end : DEFAULT_PAGE_HOURS.workEnd,
    workDays: days.length ? [...new Set(days)].sort((a, b) => a - b) : [...DEFAULT_PAGE_HOURS.workDays],
    note: String(source?.note || '').trim().slice(0, 160),
  }
}

function pickGeo(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function pickPage(source = {}) {
  const next = {
    ...PAGE_DEFAULTS,
    photos: [...PAGE_DEFAULTS.photos],
    workUrls: [...PAGE_DEFAULTS.workUrls],
    theme: { ...DEFAULT_THEME },
    about: { body: '', people: [] },
    hours: { ...DEFAULT_PAGE_HOURS, workDays: [...DEFAULT_PAGE_HOURS.workDays] },
  }
  if (source.slug !== undefined) next.slug = slugify(source.slug)
  if (source.published !== undefined) next.published = Boolean(source.published)
  if (source.title !== undefined) next.title = String(source.title).trim().slice(0, 80)
  if (source.description !== undefined) next.description = String(source.description).trim().slice(0, 800)
  if (Array.isArray(source.photos)) {
    next.photos = [0, 1].map((i) => String(source.photos[i] || '').trim().slice(0, 240))
  }
  if (Array.isArray(source.workUrls)) {
    next.workUrls = [0, 1].map((i) => pageWebsite(source.workUrls[i]))
  }
  if (source.banner !== undefined) next.banner = String(source.banner).trim().slice(0, 240)
  for (const key of ['instagram', 'facebook', 'linkedin', 'website', 'address', 'city', 'postalCode', 'phone', 'email']) {
    if (source[key] !== undefined) next[key] = String(source[key]).trim().slice(0, 200)
  }
  if (source.lat !== undefined) {
    const lat = pickGeo(source.lat)
    next.lat = lat != null && lat >= -90 && lat <= 90 ? lat : null
  }
  if (source.lng !== undefined) {
    const lng = pickGeo(source.lng)
    next.lng = lng != null && lng >= -180 && lng <= 180 ? lng : null
  }
  next.hours = pickPageHours(source.hours)
  next.theme = pickTheme(source.theme)
  next.about = pickAbout(source.about)
  return next
}

const pageSchema = new mongoose.Schema(
  {
    slug: { type: String, trim: true, lowercase: true, default: '', maxlength: 48 },
    published: { type: Boolean, default: false },
    title: { type: String, trim: true, default: '', maxlength: 80 },
    description: { type: String, trim: true, default: '', maxlength: 800 },
    photos: { type: [String], default: () => ['', ''] },
    workUrls: { type: [String], default: () => ['', ''] },
    banner: { type: String, trim: true, default: '', maxlength: 240 },
    instagram: { type: String, trim: true, default: '', maxlength: 200 },
    facebook: { type: String, trim: true, default: '', maxlength: 200 },
    linkedin: { type: String, trim: true, default: '', maxlength: 200 },
    website: { type: String, trim: true, default: '', maxlength: 200 },
    address: { type: String, trim: true, default: '', maxlength: 200 },
    city: { type: String, trim: true, default: '', maxlength: 80 },
    postalCode: { type: String, trim: true, default: '', maxlength: 20 },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    phone: { type: String, trim: true, default: '', maxlength: 40 },
    email: { type: String, trim: true, lowercase: true, default: '', maxlength: 120 },
    hours: {
      workStart: { type: String, default: '09:00' },
      workEnd: { type: String, default: '18:00' },
      workDays: { type: [Number], default: () => [1, 2, 3, 4, 5] },
      note: { type: String, trim: true, default: '', maxlength: 160 },
    },
    theme: {
      accent: { type: String, default: '#c45c26', maxlength: 7 },
      background: { type: String, default: '#f3eee4', maxlength: 7 },
      surface: { type: String, default: '#ffffff', maxlength: 7 },
    },
    about: {
      body: { type: String, trim: true, default: '', maxlength: 1200 },
      people: {
        type: [
          {
            name: { type: String, trim: true, default: '', maxlength: 80 },
            role: { type: String, trim: true, default: '', maxlength: 80 },
            bio: { type: String, trim: true, default: '', maxlength: 400 },
            photo: { type: String, trim: true, default: '', maxlength: 240 },
            _id: false,
          },
        ],
        default: () => [],
      },
    },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['member', 'president'],
      default: 'member',
    },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionRequest' },
    subscription: {
      type: subscriptionSchema,
      default: () => ({ status: 'none' }),
    },
    schedule: {
      type: scheduleSchema,
      default: () => ({}),
    },
    business: {
      type: businessSchema,
      default: () => ({}),
    },
    depositPlan: {
      type: [depositStepSchema],
      default: () => DEFAULT_DEPOSIT_PLAN.map((step) => ({ ...step })),
    },
    quoteFollowUpDays: { type: Number, min: -1, max: 90, default: 3 },
    quoteFollowUpChannel: { type: String, enum: ['email', 'phone', 'both'], default: 'email' },
    avatar: { type: String, trim: true, default: '' },
    notifications: {
      type: {
        emailBooking: { type: Boolean, default: true },
        pushBooking: { type: Boolean, default: true },
        pushReminders: { type: Boolean, default: true },
        pushRelances: { type: Boolean, default: true },
        reminderMinutes: { type: Number, enum: [5, 10, 15, 30, 60], default: 15 },
        clientBookingEmailSubject: { type: String, trim: true, default: '', maxlength: 120 },
        clientBookingEmailBody: { type: String, trim: true, default: '', maxlength: 4000 },
        pushSubscriptions: {
          type: [
            {
              endpoint: { type: String, required: true },
              keys: {
                p256dh: { type: String, default: '' },
                auth: { type: String, default: '' },
              },
              userAgent: { type: String, default: '', maxlength: 200 },
              createdAt: { type: Date, default: Date.now },
            },
          ],
          default: [],
        },
      },
      default: () => ({}),
    },
    page: {
      type: pageSchema,
      default: () => ({}),
    },
    onboarding: {
      type: {
        completedAt: Date,
        trade: { type: String, trim: true, default: '', maxlength: 32 },
        tradeLabel: { type: String, trim: true, default: '', maxlength: 60 },
        workMode: { type: String, trim: true, default: '', maxlength: 20 },
        city: { type: String, trim: true, default: '', maxlength: 80 },
        company: { type: String, trim: true, default: '', maxlength: 80 },
      },
      default: () => ({}),
    },
    workspace: {
      type: workspaceSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
)

userSchema.index(
  { 'page.slug': 1 },
  { unique: true, sparse: true, partialFilterExpression: { 'page.slug': { $type: 'string', $gt: '' } } },
)

userSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash)
}

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role || 'member',
    subscription: this.subscription?.toObject?.({ depopulate: true }) || {
      status: this.subscription?.status || 'none',
      plan: this.subscription?.plan,
      company: this.subscription?.company,
      teamSize: this.subscription?.teamSize,
      activatedAt: this.subscription?.activatedAt,
      trialEndsAt: this.subscription?.trialEndsAt,
      currentPeriodEnd: this.subscription?.currentPeriodEnd,
      cancelAtPeriodEnd: this.subscription?.cancelAtPeriodEnd,
      billingMode: this.subscription?.billingMode,
      stripeCustomerId: this.subscription?.stripeCustomerId,
      stripeSubscriptionId: this.subscription?.stripeSubscriptionId,
      upgradedToProAt: this.subscription?.upgradedToProAt,
      upgradeCharged: Boolean(this.subscription?.upgradeCharged),
      planHistory: this.subscription?.planHistory || [],
    },
    business: pickBusiness(this.business?.toObject?.() || this.business),
    depositPlan: pickDepositPlan(this.depositPlan),
    quoteFollowUpDays:
      this.quoteFollowUpDays === undefined || this.quoteFollowUpDays === null ? 3 : this.quoteFollowUpDays,
    quoteFollowUpChannel:
      this.quoteFollowUpChannel === 'phone' || this.quoteFollowUpChannel === 'both'
        ? this.quoteFollowUpChannel
        : 'email',
    avatar: this.avatar || '',
    notifications: {
      emailBooking: this.notifications?.emailBooking !== false,
      pushBooking: this.notifications?.pushBooking !== false,
      pushReminders: this.notifications?.pushReminders !== false,
      pushRelances: this.notifications?.pushRelances !== false,
      reminderMinutes: [5, 10, 15, 30, 60].includes(this.notifications?.reminderMinutes)
        ? this.notifications.reminderMinutes
        : 15,
      clientBookingEmailSubject: this.notifications?.clientBookingEmailSubject || '',
      clientBookingEmailBody: this.notifications?.clientBookingEmailBody || '',
      pushEnabled: Array.isArray(this.notifications?.pushSubscriptions)
        ? this.notifications.pushSubscriptions.length > 0
        : false,
    },
    page: pickPage(this.page?.toObject?.() || this.page || {}),
    onboarding: {
      completedAt: this.onboarding?.completedAt || null,
      trade: this.onboarding?.trade || '',
      tradeLabel: this.onboarding?.tradeLabel || '',
      workMode: this.onboarding?.workMode || '',
      city: this.onboarding?.city || '',
      company: this.onboarding?.company || '',
    },
    schedule: {
      workStart: this.schedule?.workStart || '09:00',
      workEnd: this.schedule?.workEnd || '18:00',
      durationMinutes: this.schedule?.durationMinutes || 60,
      workDays: this.schedule?.workDays?.length ? this.schedule.workDays : [1, 2, 3, 4, 5],
    },
    workspace: workspaceForUser(this),
    createdAt: this.createdAt,
  }
}

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

const User = mongoose.model('User', userSchema)
User.pickBusiness = pickBusiness
User.pickDepositPlan = pickDepositPlan
User.pickPage = pickPage
User.slugify = slugify
User.BUSINESS_DEFAULTS = BUSINESS_DEFAULTS
User.PAGE_DEFAULTS = PAGE_DEFAULTS
User.DEFAULT_DEPOSIT_PLAN = DEFAULT_DEPOSIT_PLAN
module.exports = User
