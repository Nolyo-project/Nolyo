const User = require('../models/User')
const { sendTrialEnding } = require('../utils/emails')
const { stripeEnabled, getStripe, syncUserFromSubscription } = require('../utils/stripe')

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(value) {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

async function sendTrialReminders() {
  const inTwoDays = new Date()
  inTwoDays.setDate(inTwoDays.getDate() + 2)
  const from = startOfDay(inTwoDays)
  const to = endOfDay(inTwoDays)
  const users = await User.find({
    role: 'member',
    'subscription.status': 'trialing',
    'subscription.trialEndsAt': { $gte: from, $lte: to },
    'subscription.reminderSentAt': { $exists: false },
  })
  for (const user of users) {
    try {
      await sendTrialEnding(user)
      user.subscription.reminderSentAt = new Date()
      await user.save()
    } catch (err) {
      console.error('J-2 reminder failed', user.email, err.message)
    }
  }
  return users.length
}

async function lockEndedTrials() {
  if (!stripeEnabled()) return 0
  const stripe = getStripe()
  // Grâce de 2 jours après la fin d’essai : laisse le prélèvement auto passer avant de bloquer
  const graceLimit = new Date()
  graceLimit.setDate(graceLimit.getDate() - 2)

  const users = await User.find({
    role: 'member',
    'subscription.status': 'trialing',
    'subscription.trialEndsAt': { $lte: graceLimit },
    'subscription.stripeSubscriptionId': { $gt: '' },
  })

  let locked = 0
  for (const user of users) {
    try {
      if (stripe && user.subscription.stripeSubscriptionId) {
        const sub = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId)
        await syncUserFromSubscription(sub)
        const fresh = await User.findById(user._id)
        if (fresh.subscription.status === 'active' || fresh.subscription.status === 'trialing') {
          continue
        }
        if (fresh.subscription.status === 'past_due' || fresh.subscription.status === 'unpaid') {
          locked += 1
          continue
        }
      }
      user.subscription.status = 'past_due'
      await user.save()
      locked += 1
    } catch (err) {
      console.error('lock trial', user.email, err.message)
      user.subscription.status = 'past_due'
      await user.save()
      locked += 1
    }
  }
  return locked
}

async function runBillingJobs() {
  const reminders = await sendTrialReminders()
  const locked = await lockEndedTrials()
  if (reminders || locked) {
    console.info(`[billing] J-2: ${reminders} · verrous: ${locked}`)
  }
}

module.exports = { runBillingJobs, sendTrialReminders, lockEndedTrials }
