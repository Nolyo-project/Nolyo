const mongoose = require('mongoose')

const reminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    dueAt: { type: Date, required: true, index: true },
    channel: { type: String, enum: ['email', 'phone', 'both', 'other'], default: 'email' },
    kind: { type: String, enum: ['manual', 'quote', 'task'], default: 'manual' },
    done: { type: Boolean, default: false },
    notifiedAt: { type: Date },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Reminder', reminderSchema)
