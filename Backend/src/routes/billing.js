const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { needsPayment, hasWorkspaceAccess } = require('../utils/billing')
const {
  latestHostedInvoiceUrl,
  stripeEnabled,
  createUnlockCheckout,
  createCardSetupCheckout,
  applyUnlockFromCheckoutSession,
  syncMemberBilling,
  switchToInvoiceBilling,
  changeMemberPlan,
  removeCustomerPaymentMethods,
  getPaymentMethodSummary,
  getCurrentMonthPaymentStatus,
  resolveCommitmentEndsAt,
  customerHasPaymentMethod,
} = require('../utils/stripe')
const { getPlan } = require('../config/plans')
const AccountDeletionRequest = require('../models/AccountDeletionRequest')
const User = require('../models/User')

const router = express.Router()

router.use(requireAuth)

function billingPayload(user, extras = {}) {
  const sub = user.subscription || {}
  const plan = getPlan(sub.plan)
  const nextInvoiceAt = sub.nextInvoiceAt || sub.trialEndsAt || sub.currentPeriodEnd || null
  const commitmentEndsAt = resolveCommitmentEndsAt(sub)
  return {
    locked: needsPayment(user),
    access: hasWorkspaceAccess(user),
    stripe: stripeEnabled(),
    hostedInvoiceUrl: extras.hostedInvoiceUrl || '',
    card: extras.card || null,
    monthPayment: extras.monthPayment || null,
    subscription: {
      plan: sub.plan || '',
      planName: plan?.name || '',
      amount: plan?.price || 0,
      status: sub.status || 'none',
      trialEndsAt: sub.trialEndsAt || null,
      currentPeriodEnd: sub.currentPeriodEnd || null,
      nextInvoiceAt,
      commitmentEndsAt,
      paidAt: sub.paidAt || null,
      activatedAt: sub.activatedAt || null,
      hasPaymentMethod: Boolean(sub.hasPaymentMethod),
      collectionMethod: sub.collectionMethod || '',
      billingChoice: sub.billingChoice || '',
      billingChoiceAt: sub.billingChoiceAt || null,
      commitmentChoice: sub.commitmentChoice || '',
      commitmentChoiceAt: sub.commitmentChoiceAt || null,
      autoDebit: sub.collectionMethod === 'charge_automatically' && Boolean(sub.hasPaymentMethod),
    },
  }
}

router.get('/status', async (req, res) => {
  const user = req.user
  if (user.role === 'president') {
    return res.json({ locked: false, access: true })
  }
  const hostedInvoiceUrl = needsPayment(user) ? await latestHostedInvoiceUrl(user) : ''
  res.json(billingPayload(user, { hostedInvoiceUrl }))
})

router.get('/overview', async (req, res) => {
  if (req.user.role === 'president') return res.json({ locked: false, access: true })
  try {
    let user = req.user
    if (stripeEnabled()) {
      user = await syncMemberBilling(user)
      user = await User.findById(user._id)
    }
    if (!user.subscription.commitmentEndsAt) {
      const end = resolveCommitmentEndsAt(user.subscription)
      if (end) {
        user.subscription.commitmentEndsAt = end
        await user.save()
      }
    }
    const [card, monthPayment, hostedInvoiceUrl] = await Promise.all([
      getPaymentMethodSummary(user),
      getCurrentMonthPaymentStatus(user),
      needsPayment(user) ? latestHostedInvoiceUrl(user) : Promise.resolve(''),
    ])
    if (card) {
      user.subscription.hasPaymentMethod = true
      await user.save()
    }
    res.json(billingPayload(user, { card, monthPayment, hostedInvoiceUrl }))
  } catch (err) {
    console.error('billing overview', err.message)
    res.status(502).json({ error: 'Impossible de charger l’abonnement.' })
  }
})

router.post('/checkout', async (req, res) => {
  if (req.user.role === 'president') return res.status(400).json({ error: 'Indisponible.' })
  if (!stripeEnabled()) return res.status(503).json({ error: 'Paiement indisponible pour le moment.' })
  if (!needsPayment(req.user)) {
    return res.json({ alreadyPaid: true, user: req.user.toSafeJSON() })
  }
  try {
    const result = await createUnlockCheckout(req.user)
    if (result.alreadyPaid) {
      const user = await syncMemberBilling(req.user)
      if (needsPayment(user)) {
        user.subscription.status = 'active'
        user.subscription.paidAt = new Date()
        await user.save()
      }
      return res.json({ alreadyPaid: true, user: user.toSafeJSON() })
    }
    res.json({ url: result.url })
  } catch (err) {
    console.error('billing checkout', err.message)
    res.status(502).json({ error: err.message || 'Impossible d’ouvrir le paiement Stripe.' })
  }
})

router.post('/setup-card', async (req, res) => {
  if (req.user.role === 'president') return res.status(400).json({ error: 'Indisponible.' })
  if (!stripeEnabled()) return res.status(503).json({ error: 'Paiement indisponible pour le moment.' })
  try {
    const fromPrompt = Boolean(req.body?.fromPrompt)
    const fromPage = Boolean(req.body?.fromPage)
    const result = await createCardSetupCheckout(req.user, {
      purpose: fromPrompt ? 'billing_prompt' : 'save_card',
      successPath: fromPrompt
        ? '/dashboard?carte=1'
        : fromPage
          ? '/dashboard/abonnement?carte=1'
          : '/dashboard/parametres?carte=1',
    })
    res.json({ url: result.url })
  } catch (err) {
    console.error('billing setup-card', err.message)
    res.status(502).json({ error: err.message || 'Impossible d’enregistrer la carte.' })
  }
})

router.post('/remove-card', async (req, res) => {
  if (req.user.role === 'president') return res.status(400).json({ error: 'Indisponible.' })
  try {
    await removeCustomerPaymentMethods(req.user)
    await req.user.save()
    res.json({ user: req.user.toSafeJSON(), ok: true })
  } catch (err) {
    console.error('billing remove-card', err.message)
    res.status(502).json({ error: err.message || 'Impossible de retirer la carte.' })
  }
})

router.post('/upgrade', async (req, res) => {
  if (req.user.role === 'president') return res.status(400).json({ error: 'Indisponible.' })
  if (needsPayment(req.user)) {
    return res.status(403).json({
      error: 'Réglez d’abord votre facture pour changer de formule.',
      code: 'BILLING_LOCK',
    })
  }
  const plan = String(req.body?.plan || 'pro').trim()
  if (plan !== 'pro') {
    return res.status(400).json({ error: 'Seul le passage à Nolyo Pro est disponible ici.' })
  }
  if (req.user.subscription?.plan === 'pro') {
    return res.json({
      alreadyPro: true,
      user: req.user.toSafeJSON(),
      message: 'Vous êtes déjà sur Nolyo Pro.',
    })
  }
  try {
    const result = await changeMemberPlan(req.user, 'pro')
    const user = await User.findById(result.user._id)
    const hostedInvoiceUrl = await latestHostedInvoiceUrl(user)
    res.json({
      ok: true,
      upgraded: Boolean(result.changed),
      user: user.toSafeJSON(),
      hostedInvoiceUrl: hostedInvoiceUrl || '',
      message:
        'Vous êtes passé à Nolyo Pro. Clients, agenda et notes sont inchangés — la page pro et le QR sont débloqués.',
    })
  } catch (err) {
    console.error('billing upgrade', err.message)
    res.status(502).json({ error: err.message || 'Impossible de passer à Pro pour le moment.' })
  }
})

router.post('/choice', async (req, res) => {
  if (req.user.role === 'president') return res.status(400).json({ error: 'Indisponible.' })
  const choice = String(req.body?.choice || '').trim()
  const phase = String(req.body?.phase || 'trial').trim() === 'commitment' ? 'commitment' : 'trial'
  if (!['auto', 'invoice', 'stop'].includes(choice)) {
    return res.status(400).json({ error: 'Choix invalide.' })
  }

  try {
    const wantedPlan = String(req.body?.plan || '').trim()
    if (wantedPlan === 'essentiel' || wantedPlan === 'pro') {
      await changeMemberPlan(req.user, wantedPlan)
      req.user = await User.findById(req.user._id)
    }

    if (choice === 'auto') {
      const hasPm =
        Boolean(req.user.subscription?.hasPaymentMethod) ||
        (await customerHasPaymentMethod(req.user.subscription?.stripeCustomerId))

      if (phase === 'commitment' && hasPm && req.user.subscription?.collectionMethod !== 'send_invoice') {
        req.user.subscription.commitmentChoice = 'continue_auto'
        req.user.subscription.commitmentChoiceAt = new Date()
        req.user.subscription.commitmentPromptSeenAt = new Date()
        req.user.subscription.collectionMethod = 'charge_automatically'
        req.user.subscription.hasPaymentMethod = true
        await req.user.save()
        return res.json({
          kept: true,
          message: 'Parfait — on garde le même fonctionnement (prélèvement automatique).',
          user: req.user.toSafeJSON(),
          choice: 'auto',
          phase,
        })
      }

      if (phase === 'commitment' && hasPm) {
        // Remettre en auto si besoin
        const { enableAutoCharge, getStripe } = require('../utils/stripe')
        const stripe = getStripe()
        if (stripe && req.user.subscription?.stripeCustomerId) {
          const list = await stripe.paymentMethods.list({
            customer: req.user.subscription.stripeCustomerId,
            type: 'card',
            limit: 1,
          })
          if (list.data[0]) await enableAutoCharge(req.user, list.data[0].id)
        }
        req.user.subscription.commitmentChoice = 'continue_auto'
        req.user.subscription.commitmentChoiceAt = new Date()
        req.user.subscription.commitmentPromptSeenAt = new Date()
        await req.user.save()
        return res.json({
          kept: true,
          message: 'Parfait — on garde le même fonctionnement (prélèvement automatique).',
          user: req.user.toSafeJSON(),
          choice: 'auto',
          phase,
        })
      }

      const result = await createCardSetupCheckout(req.user, {
        purpose: 'billing_prompt',
        successPath: phase === 'commitment' ? '/dashboard?carte=1&phase=commitment' : '/dashboard?carte=1',
      })
      return res.json({ url: result.url, choice: 'auto', phase, plan: req.user.subscription?.plan })
    }

    if (choice === 'invoice') {
      const user = await switchToInvoiceBilling(req.user)
      if (phase === 'commitment') {
        user.subscription.commitmentChoice = 'continue_invoice'
        user.subscription.commitmentChoiceAt = new Date()
        user.subscription.commitmentPromptSeenAt = new Date()
        await user.save()
      }
      return res.json({ user: user.toSafeJSON(), choice: 'invoice', phase, plan: user.subscription?.plan })
    }

    // stop → retirer la carte puis demande de suppression
    const message = String(
      req.body?.message ||
        (phase === 'commitment'
          ? 'Je souhaite arrêter Nolyo à la fin de mon engagement (carte retirée).'
          : 'Je souhaite arrêter Nolyo à la fin de mon mois offert (choix depuis la fenêtre de facturation).'),
    ).trim()
    if (message.length < 12) {
      return res.status(400).json({ error: 'Indiquez pourquoi vous souhaitez arrêter.' })
    }

    await removeCustomerPaymentMethods(req.user)

    const pending = await AccountDeletionRequest.findOne({ user: req.user._id, status: 'pending' })
    if (pending) {
      if (phase === 'commitment') {
        req.user.subscription.commitmentChoice = 'stop'
        req.user.subscription.commitmentChoiceAt = new Date()
        req.user.subscription.commitmentPromptSeenAt = new Date()
      } else {
        req.user.subscription.billingChoice = 'stop'
        req.user.subscription.billingChoiceAt = new Date()
        req.user.subscription.billingPromptSeenAt = new Date()
      }
      await req.user.save()
      const user = await AccountDeletionRequest.decorateUser(req.user)
      return res.json({
        user,
        choice: 'stop',
        phase,
        cardRemoved: true,
        deletionPending: true,
        message: 'Carte retirée. Votre demande d’arrêt est déjà chez le fondateur.',
      })
    }

    await AccountDeletionRequest.create({
      user: req.user._id,
      name: req.user.name,
      email: req.user.email,
      company: req.user.subscription?.company || req.user.business?.tradeName || '',
      plan: req.user.subscription?.plan || '',
      message,
      status: 'pending',
    })

    if (phase === 'commitment') {
      req.user.subscription.commitmentChoice = 'stop'
      req.user.subscription.commitmentChoiceAt = new Date()
      req.user.subscription.commitmentPromptSeenAt = new Date()
    } else {
      req.user.subscription.billingChoice = 'stop'
      req.user.subscription.billingChoiceAt = new Date()
      req.user.subscription.billingPromptSeenAt = new Date()
    }
    await req.user.save()
    const user = await AccountDeletionRequest.decorateUser(req.user)
    return res.status(201).json({
      user,
      choice: 'stop',
      phase,
      cardRemoved: true,
      deletionPending: true,
      message: 'Carte retirée. Votre demande d’arrêt a été envoyée au fondateur.',
    })
  } catch (err) {
    console.error('billing choice', err.message)
    res.status(502).json({ error: err.message || 'Impossible d’enregistrer ce choix.' })
  }
})

router.post('/confirm', async (req, res) => {
  if (req.user.role === 'president') return res.status(400).json({ error: 'Indisponible.' })
  if (!stripeEnabled()) return res.status(503).json({ error: 'Paiement indisponible pour le moment.' })

  try {
    const sessionId = String(req.body?.sessionId || req.body?.session_id || '').trim()
    const phase = String(req.body?.phase || '').trim()
    let user = req.user

    if (sessionId) {
      const result = await applyUnlockFromCheckoutSession(user, sessionId)
      user = result.user
      if (!result.paid) {
        user = await syncMemberBilling(user)
      }
    } else {
      user = await syncMemberBilling(user)
    }

    if (phase === 'commitment' || req.body?.markCommitment) {
      user.subscription.commitmentChoice = 'continue_auto'
      user.subscription.commitmentChoiceAt = new Date()
      user.subscription.commitmentPromptSeenAt = new Date()
      await user.save()
    }

    const fresh = await User.findById(user._id)
    res.json({
      paid: !needsPayment(fresh),
      access: hasWorkspaceAccess(fresh),
      user: fresh.toSafeJSON(),
      ...billingPayload(fresh),
    })
  } catch (err) {
    console.error('billing confirm', err.message)
    res.status(502).json({ error: err.message || 'Confirmation de paiement impossible.' })
  }
})

module.exports = router
