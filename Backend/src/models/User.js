const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['essentiel', 'pro'],
    },
    status: {
      type: String,
      enum: ['none', 'active'],
      default: 'none',
    },
    company: { type: String, trim: true, default: '' },
    teamSize: { type: String, trim: true, default: '' },
    activatedAt: Date,
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
  },
  { timestamps: true },
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
    subscription: this.subscription || { status: 'none' },
    business: pickBusiness(this.business?.toObject?.() || this.business),
    depositPlan: pickDepositPlan(this.depositPlan),
    schedule: {
      workStart: this.schedule?.workStart || '09:00',
      workEnd: this.schedule?.workEnd || '18:00',
      durationMinutes: this.schedule?.durationMinutes || 60,
      workDays: this.schedule?.workDays?.length ? this.schedule.workDays : [1, 2, 3, 4, 5],
    },
    createdAt: this.createdAt,
  }
}

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

const User = mongoose.model('User', userSchema)
User.pickBusiness = pickBusiness
User.pickDepositPlan = pickDepositPlan
User.BUSINESS_DEFAULTS = BUSINESS_DEFAULTS
User.DEFAULT_DEPOSIT_PLAN = DEFAULT_DEPOSIT_PLAN
module.exports = User
