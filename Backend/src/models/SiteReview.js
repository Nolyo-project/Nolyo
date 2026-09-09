const mongoose = require('mongoose')

const siteReviewSchema = new mongoose.Schema(
  {
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, trim: true, default: '', maxlength: 80 },
    place: { type: String, trim: true, default: '', maxlength: 80 },
    authorEmail: { type: String, trim: true, lowercase: true, default: '', maxlength: 120 },
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
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

siteReviewSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('SiteReview', siteReviewSchema)
