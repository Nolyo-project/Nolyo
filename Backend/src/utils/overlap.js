const Appointment = require('../models/Appointment')

async function hasOverlap(userId, startAt, durationMinutes, excludeId) {
  const endAt = new Date(startAt.getTime() + durationMinutes * 60000)
  const windowStart = new Date(startAt.getTime() - 4 * 60 * 60000)
  const candidates = await Appointment.find({
    user: userId,
    status: 'planned',
    startAt: { $gte: windowStart, $lt: endAt },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
  return candidates.some((item) => {
    const itemEnd = new Date(item.startAt.getTime() + (item.durationMinutes || 60) * 60000)
    return item.startAt < endAt && itemEnd > startAt
  })
}

function isDuplicateKey(error) {
  return error?.code === 11000
}

module.exports = { hasOverlap, isDuplicateKey }
