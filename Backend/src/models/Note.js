const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, trim: true, default: '', maxlength: 4000 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Note', noteSchema)
