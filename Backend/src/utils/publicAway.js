const Absence = require('../models/Absence')
const { ymdFromDate } = require('./bookingSlots')

function formatFrRange(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  const opts = { day: 'numeric', month: 'long' }
  if (startDate === endDate) {
    return start.toLocaleDateString('fr-FR', { ...opts, weekday: 'long' })
  }
  return `${start.toLocaleDateString('fr-FR', opts)} → ${end.toLocaleDateString('fr-FR', opts)}`
}

/** Infos publiques d’absence (sans motif / titre). */
async function publicAwayInfo(userId, now = new Date()) {
  const today = ymdFromDate(now)
  const current = await Absence.findOne({
    user: userId,
    startDate: { $lte: today },
    endDate: { $gte: today },
  })
    .select('startDate endDate')
    .lean()

  if (current) {
    return {
      away: true,
      awayStart: current.startDate,
      awayEnd: current.endDate,
      awayLabel: formatFrRange(current.startDate, current.endDate),
    }
  }

  const upcoming = await Absence.findOne({
    user: userId,
    startDate: { $gt: today },
  })
    .sort({ startDate: 1 })
    .select('startDate endDate')
    .lean()

  if (upcoming) {
    return {
      away: false,
      nextAwayStart: upcoming.startDate,
      nextAwayEnd: upcoming.endDate,
      nextAwayLabel: formatFrRange(upcoming.startDate, upcoming.endDate),
    }
  }

  return { away: false }
}

module.exports = { publicAwayInfo, formatFrRange }
