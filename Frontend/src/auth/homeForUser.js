import { founderHomePath } from '../config/site'
import { hasWorkspaceAccess, needsPayment } from '../data/billing'

export function needsOnboarding(user) {
  if (!user || user.role === 'president' || user.preview) return false
  if (!hasWorkspaceAccess(user)) return false
  return !user.onboarding?.completedAt
}

export function homeForUser(user) {
  if (!user) return '/login'
  if (user.role === 'president') return founderHomePath()
  if (needsPayment(user)) return '/facture'
  if (hasWorkspaceAccess(user)) {
    return needsOnboarding(user) ? '/onboarding' : '/dashboard'
  }
  return '/inscription'
}
