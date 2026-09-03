const mongoose = require('mongoose')

const contactSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    firstName: { type: String, trim: true, default: '', maxlength: 40 },
    lastName: { type: String, trim: true, default: '', maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '', maxlength: 40 },
    company: { type: String, trim: true, default: '', maxlength: 120 },
    activity: { type: String, trim: true, default: '', maxlength: 160 },
    kind: { type: String, enum: ['client', 'prospect'], default: 'client' },
    price: { type: Number, min: 0, default: 0 },
    depositPlan: {
      type: [
        {
          label: { type: String, trim: true, default: '', maxlength: 40 },
          percent: { type: Number, min: 0, max: 100, default: 0 },
          paid: { type: Boolean, default: false },
          paidAt: Date,
          transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        },
      ],
      default: [],
    },
    nextAction: { type: String, trim: true, default: '', maxlength: 200 },
    notes: { type: String, trim: true, default: '', maxlength: 2000 },
    jobStatus: { type: String, enum: ['open', 'done', 'archived'], default: 'open' },
    completedAt: Date,
    completionTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Contact', contactSchema)
