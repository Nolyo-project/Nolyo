const SPECIAL_RE = /[^A-Za-z0-9]/
const UPPER_RE = /[A-Z]/

export function passwordStrengthError(password) {
  const value = String(password || '')
  if (value.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères.'
  }
  if (!UPPER_RE.test(value)) {
    return 'Le mot de passe doit contenir au moins une majuscule.'
  }
  if (!SPECIAL_RE.test(value)) {
    return 'Le mot de passe doit contenir au moins un caractère spécial (ex. ! @ # ?).'
  }
  return ''
}

export function isStrongPassword(password) {
  return !passwordStrengthError(password)
}
