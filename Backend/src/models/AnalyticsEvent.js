const mongoose = require('mongoose')

const TYPES = ['page_view', 'preview_start']

const analyticsEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: TYPES, index: true },
    path: { type: String, trim: true, default: '', maxlength: 300 },
    plan: { type: String, enum: ['essentiel', 'pro', ''], default: '' },
    referrer: { type: String, trim: true, default: '', maxlength: 500 },
    source: { type: String, trim: true, default: '', maxlength: 80, index: true },
    medium: { type: String, trim: true, default: '', maxlength: 80 },
    campaign: { type: String, trim: true, default: '', maxlength: 120 },
    sessionId: { type: String, trim: true, default: '', maxlength: 64, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

analyticsEventSchema.index({ type: 1, createdAt: -1 })
analyticsEventSchema.index({ type: 1, plan: 1, createdAt: -1 })

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema)
module.exports.TYPES = TYPES
