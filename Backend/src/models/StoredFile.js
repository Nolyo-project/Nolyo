const mongoose = require('mongoose')

const storedFileSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    mime: { type: String, required: true, trim: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('StoredFile', storedFileSchema)
