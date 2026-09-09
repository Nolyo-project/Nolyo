const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
    authorEmail: { type: String, trim: true, lowercase: true, default: '', maxlength: 120 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, required: true, trim: true, maxlength: 800 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
)

reviewSchema.index({ user: 1, status: 1, createdAt: -1 })

module.exports = mongoose.model('Review', reviewSchema)
