const mongoose = require('mongoose')

const serviceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    kind: { type: String, enum: ['session', 'quote'], default: 'session' },
    price: { type: Number, min: 0, default: 0 },
    durationMinutes: { type: Number, default: 60, min: 15, max: 240 },
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Service', serviceSchema)
