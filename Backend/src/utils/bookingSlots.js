const Appointment = require('../models/Appointment')

const TIMEZONE = 'Europe/Paris'
const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function pad(value) {
  return String(value).padStart(2, '0')
}

function zonedParts(date, timeZone = TIMEZONE) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((item) => [item.type, item.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY[parts.weekday] ?? 0,
  }
}

function zonedTimeToDate(year, month, day, hour, minute, timeZone = TIMEZONE) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0)
  const instant = new Date(utcGuess)
  const parts = zonedParts(instant, timeZone)
  const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  return new Date(utcGuess - (asIfUtc - utcGuess))
}

function parseMinutes(hhmm) {
  const [hours, minutes] = String(hhmm || '09:00').split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

function formatMinutes(total) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function buildDaySlots(workStart, workEnd, durationMinutes) {
  const start = parseMinutes(workStart)
  const end = parseMinutes(workEnd)
  const duration = Number(durationMinutes) || 60
  const slots = []
  if (duration <= 0 || start >= end) return slots
  for (let time = start; time + duration <= end; time += duration) {
    slots.push({ startMinutes: time, label: formatMinutes(time) })
  }
  return slots
}

function resolveSchedule(user) {
  return {
    workStart: user.schedule?.workStart || '09:00',
    workEnd: user.schedule?.workEnd || '18:00',
    durationMinutes: user.schedule?.durationMinutes || 60,
    workDays: user.schedule?.workDays?.length ? [...user.schedule.workDays] : [1, 2, 3, 4, 5],
  }
}

function addDaysYmd(year, month, day, amount) {
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function ymdKey({ year, month, day }) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function todayYmd() {
  const parts = zonedParts(new Date())
  return { year: parts.year, month: parts.month, day: parts.day }
}

function isValidPublicSlot(startAt, durationMinutes, schedule) {
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) return false
  const parts = zonedParts(startAt)
  if (!schedule.workDays.includes(parts.weekday)) return false
  const minutes = parts.hour * 60 + parts.minute
  return buildDaySlots(schedule.workStart, schedule.workEnd, durationMinutes).some(
    (slot) => slot.startMinutes === minutes,
  )
}

async function listAvailability(user, durationMinutes, dayCount = 21) {
  const schedule = resolveSchedule(user)
  const slotsTemplate = buildDaySlots(schedule.workStart, schedule.workEnd, durationMinutes)
  const from = todayYmd()
  const start = zonedTimeToDate(from.year, from.month, from.day, 0, 0)
  const endYmd = addDaysYmd(from.year, from.month, from.day, dayCount)
  const end = zonedTimeToDate(endYmd.year, endYmd.month, endYmd.day, 0, 0)
  const appointments = await Appointment.find({
    user: user._id,
    status: 'planned',
    startAt: { $gte: new Date(start.getTime() - 4 * 3600000), $lt: new Date(end.getTime() + 24 * 3600000) },
  }).select('startAt durationMinutes')

  const now = Date.now()
  const days = []
  for (let index = 0; index < dayCount; index += 1) {
    const ymd = addDaysYmd(from.year, from.month, from.day, index)
    const noon = zonedTimeToDate(ymd.year, ymd.month, ymd.day, 12, 0)
    const weekday = zonedParts(noon).weekday
    if (!schedule.workDays.includes(weekday)) continue
    const slots = []
    for (const slot of slotsTemplate) {
      const startAt = zonedTimeToDate(
        ymd.year,
        ymd.month,
        ymd.day,
        Math.floor(slot.startMinutes / 60),
        slot.startMinutes % 60,
      )
      if (startAt.getTime() <= now) continue
      const endAt = startAt.getTime() + durationMinutes * 60000
      const busy = appointments.some((item) => {
        const fromAt = item.startAt.getTime()
        const toAt = fromAt + (item.durationMinutes || 60) * 60000
        return fromAt < endAt && toAt > startAt.getTime()
      })
      if (!busy) slots.push({ label: slot.label, startAt: startAt.toISOString() })
    }
    if (slots.length) days.push({ date: ymdKey(ymd), slots })
  }
  return days
}

module.exports = {
  TIMEZONE,
  resolveSchedule,
  isValidPublicSlot,
  listAvailability,
  zonedParts,
}
