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
  },
  { timestamps: true },
)

module.exports = mongoose.model('Appointment', appointmentSchema)
