const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const DayLog = require('../models/DayLog')
const InboxItem = require('../models/InboxItem')
const Note = require('../models/Note')
const Reminder = require('../models/Reminder')
const Service = require('../models/Service')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const { removeFile } = require('./uploads')

async function deleteMemberAccount(user) {
  const id = user._id
  const page = User.pickPage(user.page?.toObject?.() || user.page || {})
  await Promise.all([
    removeFile(user.avatar),
    removeFile(page.banner),
    ...(page.photos || []).map((photo) => removeFile(photo)),
    ...(page.about?.people || []).map((person) => removeFile(person.photo)),
  ])

  await Promise.all([
    Appointment.deleteMany({ user: id }),
    Contact.deleteMany({ user: id }),
    DayLog.deleteMany({ user: id }),
    InboxItem.deleteMany({ user: id }),
    Note.deleteMany({ user: id }),
    Reminder.deleteMany({ user: id }),
    Service.deleteMany({ user: id }),
    Transaction.deleteMany({ user: id }),
  ])

  await User.deleteOne({ _id: id })
}

module.exports = { deleteMemberAccount }
