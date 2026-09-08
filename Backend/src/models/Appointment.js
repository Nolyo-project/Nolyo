const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    startAt: { type: Date, required: true, index: true },
    location: { type: String, trim: true, default: '', maxlength: 120 },
    notes: { type: String, trim: true, default: '', maxlength: 1000 },
    durationMinutes: { type: Number, default: 60, min: 15, max: 240 },
    status: { type: String, enum: ['planned', 'done', 'cancelled'], default: 'planned' },
    source: { type: String, enum: ['manual', 'booking'], default: 'manual' },
    kind: { type: String, enum: ['session', 'quote'], default: 'session' },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    serviceName: { type: String, trim: true, default: '', maxlength: 80 },
    servicePrice: { type: Number, min: 0, default: 0 },
    paymentStatus: { type: String, enum: ['none', 'paid', 'unpaid', 'absent'], default: 'none' },
    paymentMethod: { type: String, enum: ['cash', 'card', 'cheque', 'transfer'] },
    paymentTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true },
)

appointmentSchema.index(
  { user: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { status: 'planned' } },
)

module.exports = mongoose.model('Appointment', appointmentSchema)
