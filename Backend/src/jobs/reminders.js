const Appointment = require('../models/Appointment')
const Reminder = require('../models/Reminder')
const { sendPushToUser } = require('../utils/push')

async function sendAppointmentReminders() {
  const now = Date.now()
  const horizon = now + 70 * 60 * 1000
  const appointments = await Appointment.find({
    status: 'planned',
    startAt: { $gt: new Date(now), $lte: new Date(horizon) },
    reminderNotifiedAt: { $exists: false },
  })
    .populate('user')
    .populate('contact', 'name firstName')
    .limit(100)

  let sent = 0
  for (const item of appointments) {
    const user = item.user
    if (!user || user.notifications?.pushReminders === false) continue
    const minutes = [5, 10, 15, 30, 60].includes(user.notifications?.reminderMinutes)
      ? user.notifications.reminderMinutes
      : 15
    const start = new Date(item.startAt).getTime()
    const minsLeft = Math.round((start - now) / 60000)
    if (minsLeft > minutes || minsLeft < 0) continue

    try {
      await sendPushToUser(user, {
        title: 'Rendez-vous bientôt',
        body: `${item.serviceName || item.title} dans ${minsLeft} min`,
        url: '/dashboard/rdv',
      })
      item.reminderNotifiedAt = new Date()
      await item.save()
      sent += 1
    } catch (err) {
      console.error('RDV reminder', err.message)
    }
  }
  return sent
}

async function sendFollowUpPushes() {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000)
  const due = await Reminder.find({
    done: false,
    dueAt: { $gte: windowStart, $lte: now },
    notifiedAt: { $exists: false },
  })
    .populate('user')
    .populate('contact', 'name')
    .limit(80)

  let sent = 0
  for (const item of due) {
    const user = item.user
    if (!user || user.notifications?.pushRelances === false) continue
    try {
      await sendPushToUser(user, {
        title: 'Relance à faire',
        body: item.title || `Relancer ${item.contact?.name || 'un client'}`,
        url: '/dashboard/relances',
      })
      item.notifiedAt = new Date()
      await item.save()
      sent += 1
    } catch (err) {
      console.error('Follow-up push', err.message)
    }
  }
  return sent
}

async function runReminderJobs() {
  const [rdv, followUps] = await Promise.all([sendAppointmentReminders(), sendFollowUpPushes()])
  return { rdv, followUps }
}

module.exports = { sendAppointmentReminders, sendFollowUpPushes, runReminderJobs }
