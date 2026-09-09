export const OPEN_STATUSES = new Set(['active', 'trialing'])
export const LOCK_STATUSES = new Set(['past_due', 'unpaid', 'incomplete', 'canceled'])

export function hasWorkspaceAccess(user) {
  if (!user) return false
  if (user.role === 'president' || user.preview) return true
  return OPEN_STATUSES.has(user.subscription?.status)
}

export function needsPayment(user) {
  return Boolean(user && user.role === 'member' && !user.preview && LOCK_STATUSES.has(user.subscription?.status))
}

export function billingLabel(status) {
  return (
    {
      trialing: 'Mois offert',
      active: 'À jour',
      past_due: 'Facture à régler',
      unpaid: 'Impayé',
      canceled: 'Résilié',
      none: 'Sans offre',
    }[status] || status || '—'
  )
}
