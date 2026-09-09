const User = require('../models/User')
const { verifyToken } = require('../utils/token')

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Connectez-vous pour continuer.' })
  }

  try {
    const payload = verifyToken(token)
    const user = await User.findById(payload.sub)

    if (!user) {
      return res.status(401).json({ error: 'Session invalide.' })
    }

    req.user = user
    req.auth = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' })
  }
}

function requirePresident(req, res, next) {
  if (req.user.role !== 'president') {
    return res.status(404).json({ error: 'Route introuvable.' })
  }
  next()
}

function requireSubscription(req, res, next) {
  if (req.user.role === 'president') {
    return res.status(403).json({ error: 'Utilisez le dashboard président.' })
  }

  const { hasWorkspaceAccess, needsPayment } = require('../utils/billing')
  if (needsPayment(req.user)) {
    return res.status(403).json({
      error: 'Réglez votre facture pour rouvrir le tableau de bord.',
      code: 'BILLING_LOCK',
    })
  }

  if (!hasWorkspaceAccess(req.user)) {
    return res.status(403).json({
      error: 'Un abonnement actif est requis.',
      code: 'SUBSCRIPTION_REQUIRED',
    })
  }

  next()
}

module.exports = { requireAuth, requirePresident, requireSubscription }
