const OPEN_STATUSES = new Set(['active', 'trialing'])
const LOCK_STATUSES = new Set(['past_due', 'unpaid', 'incomplete', 'canceled'])

function subscriptionStatus(user) {
  return user?.subscription?.status || 'none'
}

function hasWorkspaceAccess(user) {
  if (!user) return false
  if (user.role === 'president' || user.preview) return true
  return OPEN_STATUSES.has(subscriptionStatus(user))
}

function needsPayment(user) {
  return LOCK_STATUSES.has(subscriptionStatus(user))
}

module.exports = { OPEN_STATUSES, LOCK_STATUSES, subscriptionStatus, hasWorkspaceAccess, needsPayment }
