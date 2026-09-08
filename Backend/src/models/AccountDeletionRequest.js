const mongoose = require('mongoose')

const STATUSES = ['pending', 'accepted', 'refused']

const accountDeletionRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    company: { type: String, trim: true, default: '', maxlength: 120 },
    plan: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
      index: true,
    },
    refusalNote: { type: String, trim: true, default: '', maxlength: 500 },
    resolvedAt: Date,
  },
  { timestamps: true },
)

accountDeletionRequestSchema.methods.toPresidentJSON = function toPresidentJSON() {
  return {
    id: this._id,
    userId: this.user || null,
    name: this.name,
    email: this.email,
    company: this.company,
    plan: this.plan,
    message: this.message,
    status: this.status,
    refusalNote: this.refusalNote || '',
    createdAt: this.createdAt,
    resolvedAt: this.resolvedAt,
  }
}

accountDeletionRequestSchema.methods.toMemberJSON = function toMemberJSON() {
  return {
    id: this._id,
    status: this.status,
    message: this.message,
    refusalNote: this.refusalNote || '',
    createdAt: this.createdAt,
    resolvedAt: this.resolvedAt,
  }
}

accountDeletionRequestSchema.statics.decorateUser = async function decorateUser(user) {
  const json = user.toSafeJSON()
  const latest = await this.findOne({ user: user._id }).sort({ createdAt: -1 })
  json.deletionRequest =
    latest && latest.status !== 'accepted' ? latest.toMemberJSON() : null
  return json
}

module.exports = mongoose.model('AccountDeletionRequest', accountDeletionRequestSchema)
module.exports.STATUSES = STATUSES
