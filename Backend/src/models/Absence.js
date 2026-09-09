const mongoose = require('mongoose')

const absenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    kind: {
      type: String,
      enum: ['vacation', 'sick', 'personal', 'other'],
      default: 'vacation',
    },
    /** Inclusive calendar day YYYY-MM-DD (Europe/Paris). */
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    /** Inclusive calendar day YYYY-MM-DD (Europe/Paris). */
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    note: { type: String, trim: true, default: '', maxlength: 500 },
  },
  { timestamps: true },
)

absenceSchema.index({ user: 1, startDate: 1, endDate: 1 })

module.exports = mongoose.model('Absence', absenceSchema)
