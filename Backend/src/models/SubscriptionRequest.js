const mongoose = require('mongoose')

const STATUSES = ['received', 'quote_sent', 'paid', 'code_issued', 'registered']

const subscriptionRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    teamSize: { type: String, required: true, trim: true },
    plan: {
      type: String,
      required: true,
      enum: ['essentiel', 'pro'],
    },
    message: { type: String, trim: true, default: '', maxlength: 2000 },
    status: {
      type: String,
      enum: STATUSES,
      default: 'received',
      index: true,
    },
    quoteNote: { type: String, trim: true, default: '', maxlength: 500 },
    quoteSentAt: Date,
    paidAt: Date,
    inviteCode: { type: String, unique: true, sparse: true },
    inviteCodeCreatedAt: Date,
    registeredAt: Date,
    issueNote: { type: String, trim: true, default: '', maxlength: 500 },
    issueAt: Date,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    stripeCustomerId: { type: String, trim: true, default: '' },
    stripeSubscriptionId: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

subscriptionRequestSchema.methods.toPresidentJSON = function toPresidentJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    company: this.company,
    teamSize: this.teamSize,
    plan: this.plan,
    message: this.message,
    status: this.status,
    quoteNote: this.quoteNote,
    quoteSentAt: this.quoteSentAt,
    paidAt: this.paidAt,
    inviteCode: this.inviteCode || null,
    inviteCodeCreatedAt: this.inviteCodeCreatedAt,
    registeredAt: this.registeredAt,
    issueNote: this.issueNote || '',
    issueAt: this.issueAt || null,
    userId: this.user || null,
    stripeCustomerId: this.stripeCustomerId || '',
    stripeSubscriptionId: this.stripeSubscriptionId || '',
    createdAt: this.createdAt,
  }
}

module.exports = mongoose.model('SubscriptionRequest', subscriptionRequestSchema)
module.exports.STATUSES = STATUSES
