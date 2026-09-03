const mongoose = require('mongoose')

const inboxItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    source: { type: String, enum: ['instagram', 'facebook', 'email'], required: true },
    from: { type: String, required: true, trim: true, maxlength: 120 },
    preview: { type: String, required: true, trim: true, maxlength: 500 },
    receivedAt: { type: Date, required: true, default: Date.now },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
)

module.exports = mongoose.model('InboxItem', inboxItemSchema)
