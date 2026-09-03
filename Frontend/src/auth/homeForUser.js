export function homeForUser(user) {
  if (!user) return '/login'
  if (user.role === 'president') return '/president'
  if (user.subscription?.status === 'active') return '/dashboard'
  return '/inscription'
}
