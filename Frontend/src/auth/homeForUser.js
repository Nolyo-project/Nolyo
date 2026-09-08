import { founderHomePath } from '../config/site'

export function needsOnboarding(user) {
  if (!user || user.role === 'president' || user.preview) return false
  if (user.subscription?.status !== 'active') return false
  return !user.onboarding?.completedAt
}

export function homeForUser(user) {
  if (!user) return '/login'
  if (user.role === 'president') return founderHomePath()
  if (user.subscription?.status === 'active') {
    return needsOnboarding(user) ? '/onboarding' : '/dashboard'
  }
  return '/inscription'
}
