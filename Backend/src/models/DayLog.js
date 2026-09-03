const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
)

const dayLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dateKey: { type: String, required: true },
    tasks: { type: [taskSchema], default: [] },
    note: { type: String, trim: true, default: '', maxlength: 4000 },
    highlight: { type: String, trim: true, default: '', maxlength: 400 },
    tomorrow: { type: String, trim: true, default: '', maxlength: 400 },
    energy: { type: String, enum: ['', 'low', 'ok', 'high'], default: '' },
  },
  { timestamps: true },
)

dayLogSchema.index({ user: 1, dateKey: 1 }, { unique: true })

module.exports = mongoose.model('DayLog', dayLogSchema)
