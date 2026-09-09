const mongoose = require('mongoose')

const MODES = ['live', 'coming_soon', 'maintenance']

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'site', unique: true },
    mode: { type: String, enum: MODES, default: 'coming_soon' },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    message: { type: String, trim: true, maxlength: 800, default: '' },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    lastNotifiedAt: { type: Date, default: null },
    lastNotifyFingerprint: { type: String, default: '' },
  },
  { timestamps: true },
)

siteSettingsSchema.statics.MODES = MODES

siteSettingsSchema.methods.toPublicJSON = function toPublicJSON() {
  const active = isGateActive(this)
  return {
    mode: this.mode,
    active,
    title: this.title || defaultTitle(this.mode),
    message: this.message || defaultMessage(this.mode),
    startsAt: this.startsAt || null,
    endsAt: this.endsAt || null,
  }
}

siteSettingsSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    ...this.toPublicJSON(),
    lastNotifiedAt: this.lastNotifiedAt || null,
    updatedAt: this.updatedAt || null,
  }
}

function defaultTitle(mode) {
  if (mode === 'maintenance') return 'Maintenance en cours'
  if (mode === 'coming_soon') return 'Nolyo arrive bientôt'
  return ''
}

function defaultMessage(mode) {
  if (mode === 'maintenance') {
    return 'Nous effectuons une maintenance. Merci de votre patience — le service revient très vite.'
  }
  if (mode === 'coming_soon') {
    return 'Le site n’est pas encore ouvert au public. Suivez-nous sur Instagram pour ne rien manquer du lancement.'
  }
  return ''
}

function isGateActive(settings) {
  if (!settings || settings.mode === 'live') return false
  const now = Date.now()
  if (settings.mode === 'coming_soon') {
    if (settings.startsAt && now < new Date(settings.startsAt).getTime()) return false
    if (settings.endsAt && now > new Date(settings.endsAt).getTime()) return false
    return true
  }
  if (settings.mode === 'maintenance') {
    const start = settings.startsAt ? new Date(settings.startsAt).getTime() : null
    const end = settings.endsAt ? new Date(settings.endsAt).getTime() : null
    if (start && now < start) return false
    if (end && now > end) return false
    // Maintenance sans dates = active immédiatement
    return true
  }
  return false
}

async function getSiteSettings() {
  let doc = await mongoose.model('SiteSettings').findOne({ key: 'site' })
  if (!doc) {
    doc = await mongoose.model('SiteSettings').create({
      key: 'site',
      mode: 'coming_soon',
      title: '',
      message: '',
    })
  } else if (doc.title === 'Arrive bientôt') {
    // Ancien titre court → laisser le défaut « Nolyo arrive bientôt »
    doc.title = ''
    await doc.save()
  }
  return doc
}

siteSettingsSchema.statics.getSiteSettings = getSiteSettings
siteSettingsSchema.statics.isGateActive = isGateActive

module.exports = mongoose.model('SiteSettings', siteSettingsSchema)
