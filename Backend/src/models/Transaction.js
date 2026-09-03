const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['income', 'expense'], required: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, index: true },
    category: { type: String, trim: true, default: '', maxlength: 60 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Transaction', transactionSchema)
