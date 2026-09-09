const Stripe = require('stripe')
const { getPlan, TRIAL_DAYS } = require('../config/plans')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const SubscriptionRequest = require('../models/SubscriptionRequest')

let client

function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

function getStripe() {
  if (!stripeEnabled()) return null
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY)
  return client
}

function addDays(from, days) {
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  date.setHours(23, 59, 59, 999)
  return date
}

function localStatusFromStripe(status) {
  if (status === 'trialing') return 'trialing'
  if (status === 'active') return 'active'
  if (status === 'past_due') return 'past_due'
  if (status === 'unpaid' || status === 'incomplete' || status === 'incomplete_expired') return 'unpaid'
  if (status === 'canceled' || status === 'paused') return 'canceled'
  return 'past_due'
}

async function priceIdForPlan(planId) {
  const stripe = getStripe()
  const envName = planId === 'pro' ? 'STRIPE_PRICE_PRO' : 'STRIPE_PRICE_ESSENTIEL'
  if (process.env[envName]) return process.env[envName]
  const lookup_key = `nolyo_${planId}`
  const found = await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 })
  if (found.data[0]) return found.data[0].id
  const plan = getPlan(planId)
  const product = await stripe.products.create({
    name: plan.name,
    metadata: { noly_plan: planId },
  })
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: Math.round(plan.price * 100),
    recurring: { interval: 'month' },
    lookup_key,
    transfer_lookup_key: true,
  })
  return price.id
}

async function createCustomerForRequest(request) {
  const stripe = getStripe()
  if (!stripe) return null
  if (request.stripeCustomerId) return request.stripeCustomerId
  const customer = await stripe.customers.create({
    email: request.email,
    name: request.name,
    preferred_locales: ['fr'],
    metadata: {
      noly_request: String(request._id),
      noly_plan: request.plan,
      noly_company: request.company,
    },
  })
  request.stripeCustomerId = customer.id
  await request.save()
  return customer.id
}

async function startMemberSubscription(user, request) {
  const stripe = getStripe()
  const trialDays = getPlan(request.plan)?.trialDays || TRIAL_DAYS
  if (!user.subscription) user.subscription = {}
  user.subscription.plan = request.plan
  user.subscription.company = request.company
  user.subscription.teamSize = request.teamSize
  user.subscription.activatedAt = user.subscription.activatedAt || new Date()
  user.subscription.trialEndsAt = user.subscription.trialEndsAt || addDays(user.subscription.activatedAt, trialDays)
  if (!user.subscription.commitmentEndsAt) {
    const end = new Date(user.subscription.trialEndsAt)
    end.setMonth(end.getMonth() + 6)
    user.subscription.commitmentEndsAt = end
  }

  if (!stripe) {
    user.subscription.status = 'trialing'
    return user
  }

  const customerId = request.stripeCustomerId || (await createCustomerForRequest(request))
  await stripe.customers.update(customerId, {
    email: user.email,
    name: user.name,
    metadata: {
      noly_user: String(user._id),
      noly_request: String(request._id),
      noly_plan: request.plan,
      noly_company: request.company,
    },
  })

  if (!user.subscription.stripeSubscriptionId) {
    const price = await priceIdForPlan(request.plan)
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price }],
      trial_period_days: trialDays,
      collection_method: 'charge_automatically',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      trial_settings: {
        end_behavior: { missing_payment_method: 'create_invoice' },
      },
      metadata: {
        noly_user: String(user._id),
        noly_plan: request.plan,
        noly_company: request.company,
      },
    })
    user.subscription.stripeSubscriptionId = sub.id
    user.subscription.stripePriceId = price
    user.subscription.collectionMethod = 'charge_automatically'
    if (sub.trial_end) user.subscription.trialEndsAt = new Date(sub.trial_end * 1000)
    applySubscriptionSnapshot(user, sub)
  } else {
    user.subscription.status = user.subscription.status || 'trialing'
  }

  user.subscription.stripeCustomerId = customerId
  request.stripeCustomerId = customerId
  request.stripeSubscriptionId = user.subscription.stripeSubscriptionId
  await request.save()
  return user
}

function applySubscriptionSnapshot(user, subscription) {
  if (!user.subscription) user.subscription = {}
  user.subscription.status = localStatusFromStripe(subscription.status)
  user.subscription.stripeSubscriptionId = subscription.id
  user.subscription.stripeCustomerId = String(subscription.customer)
  if (subscription.trial_end) {
    user.subscription.trialEndsAt = new Date(subscription.trial_end * 1000)
  }
  const periodEnd = subscription.current_period_end
  if (periodEnd) user.subscription.currentPeriodEnd = new Date(periodEnd * 1000)
  const priceId = subscription.items?.data?.[0]?.price?.id
  if (priceId) user.subscription.stripePriceId = priceId
  const metaPlan = subscription.metadata?.noly_plan
  if (metaPlan === 'essentiel' || metaPlan === 'pro') {
    user.subscription.plan = metaPlan
  }
  if (subscription.collection_method) {
    user.subscription.collectionMethod = subscription.collection_method
  }
  // Prochaine facture / prélèvement
  if (subscription.status === 'trialing' && subscription.trial_end) {
    user.subscription.nextInvoiceAt = new Date(subscription.trial_end * 1000)
  } else if (periodEnd) {
    user.subscription.nextInvoiceAt = new Date(periodEnd * 1000)
  }
  const defaultPm =
    subscription.default_payment_method ||
    (typeof subscription.default_source === 'string' ? subscription.default_source : null)
  if (defaultPm) user.subscription.hasPaymentMethod = true
}

async function findUserForStripe({ customerId, userId, subscriptionId }) {
  if (userId) {
    const byId = await User.findById(userId)
    if (byId) return byId
  }
  if (subscriptionId) {
    const bySub = await User.findOne({ 'subscription.stripeSubscriptionId': subscriptionId })
    if (bySub) return bySub
  }
  if (customerId) {
    const byCustomer = await User.findOne({ 'subscription.stripeCustomerId': customerId })
    if (byCustomer) return byCustomer
  }
  return null
}

async function syncUserFromSubscription(subscription) {
  const user = await findUserForStripe({
    customerId: String(subscription.customer),
    userId: subscription.metadata?.noly_user,
    subscriptionId: subscription.id,
  })
  if (!user) return null
  applySubscriptionSnapshot(user, subscription)
  await user.save()
  return user
}

async function recordFounderIncome(invoice) {
  const amount = (invoice.amount_paid || 0) / 100
  if (amount <= 0 || !invoice.id) return null
  const founder = await User.findOne({ role: 'president' })
  if (!founder) return null
  const existing = await Transaction.findOne({ stripeInvoiceId: invoice.id })
  if (existing) return existing
  const member = await findUserForStripe({
    customerId: String(invoice.customer),
    userId: invoice.metadata?.noly_user,
    subscriptionId: String(invoice.subscription || ''),
  })
  const company =
    member?.subscription?.company || invoice.customer_name || invoice.customer_email || 'Abonnement Nolyo'
  const plan = member?.subscription?.plan || invoice.metadata?.noly_plan || 'Abonnement'
  return Transaction.create({
    user: founder._id,
    kind: 'income',
    label: company,
    amount,
    date: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date(),
    category: plan === 'pro' ? 'Nolyo Pro' : plan === 'essentiel' ? 'Nolyo Essentiel' : 'Abonnement',
    method: 'stripe',
    stripeInvoiceId: invoice.id,
  })
}

async function latestOpenInvoice(user) {
  const stripe = getStripe()
  if (!stripe || !user?.subscription?.stripeCustomerId) return null
  const open = await stripe.invoices.list({
    customer: user.subscription.stripeCustomerId,
    status: 'open',
    limit: 3,
  })
  const withAmount = open.data.find((item) => (item.amount_due || 0) > 0)
  if (withAmount) return withAmount

  const drafts = await stripe.invoices.list({
    customer: user.subscription.stripeCustomerId,
    status: 'draft',
    limit: 3,
  })
  const draft = drafts.data.find((item) => (item.amount_due || 0) > 0)
  if (!draft) return null
  try {
    return await stripe.invoices.finalizeInvoice(draft.id)
  } catch (err) {
    console.error('finalizeInvoice', err.message)
    return draft
  }
}

function clientOrigin() {
  return String(process.env.CLIENT_ORIGIN || process.env.SITE_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')
}

async function customerHasPaymentMethod(customerId) {
  const stripe = getStripe()
  if (!stripe || !customerId) return false
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) return false
  if (customer.invoice_settings?.default_payment_method) return true
  const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
  return pms.data.length > 0
}

async function enableAutoCharge(user, paymentMethodId) {
  const stripe = getStripe()
  if (!stripe) return user
  const customerId = user.subscription?.stripeCustomerId
  const subId = user.subscription?.stripeSubscriptionId
  const pmId = typeof paymentMethodId === 'string' ? paymentMethodId : paymentMethodId?.id
  if (!customerId || !pmId) return user

  await stripe.paymentMethods.attach(pmId, { customer: customerId }).catch(() => null)
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: pmId },
  })
  if (subId) {
    await stripe.subscriptions.update(subId, {
      default_payment_method: pmId,
      collection_method: 'charge_automatically',
    })
  }
  user.subscription.hasPaymentMethod = true
  user.subscription.collectionMethod = 'charge_automatically'
  return user
}

async function removeCustomerPaymentMethods(user) {
  const stripe = getStripe()
  const customerId = user.subscription?.stripeCustomerId
  if (!stripe || !customerId) {
    if (user.subscription) {
      user.subscription.hasPaymentMethod = false
      user.subscription.collectionMethod = 'send_invoice'
    }
    return user
  }

  const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 20 })
  for (const pm of methods.data) {
    try {
      await stripe.paymentMethods.detach(pm.id)
    } catch (err) {
      console.error('detach pm', err.message)
    }
  }
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: null },
  })

  const subId = user.subscription?.stripeSubscriptionId
  if (subId) {
    try {
      await stripe.subscriptions.update(subId, {
        default_payment_method: '',
        collection_method: 'send_invoice',
        days_until_due: 3,
        cancel_at_period_end: true,
      })
    } catch (err) {
      console.error('clear sub pm', err.message)
    }
  }

  if (!user.subscription) user.subscription = {}
  user.subscription.hasPaymentMethod = false
  user.subscription.collectionMethod = 'send_invoice'
  return user
}

async function getPaymentMethodSummary(user) {
  const stripe = getStripe()
  const customerId = user.subscription?.stripeCustomerId
  if (!stripe || !customerId) return null
  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) return null
    let pmId = customer.invoice_settings?.default_payment_method
    if (pmId && typeof pmId === 'object') pmId = pmId.id
    if (!pmId) {
      const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
      pmId = list.data[0]?.id
    }
    if (!pmId) return null
    const pm = await stripe.paymentMethods.retrieve(pmId)
    return {
      brand: pm.card?.brand || 'card',
      last4: pm.card?.last4 || '',
      expMonth: pm.card?.exp_month || null,
      expYear: pm.card?.exp_year || null,
    }
  } catch (err) {
    console.error('payment method summary', err.message)
    return null
  }
}

async function getCurrentMonthPaymentStatus(user) {
  const stripe = getStripe()
  const customerId = user.subscription?.stripeCustomerId
  if (!stripe || !customerId) {
    return { status: 'unknown', label: 'Non disponible' }
  }
  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 8 })
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const inMonth = invoices.data.filter((inv) => {
      const created = inv.created ? new Date(inv.created * 1000) : null
      return created && created.getMonth() === month && created.getFullYear() === year && (inv.amount_due || inv.amount_paid || 0) > 0
    })
    const paid = inMonth.find((inv) => inv.status === 'paid')
    const open = inMonth.find((inv) => inv.status === 'open' || inv.status === 'uncollectible')
    if (user.subscription?.status === 'trialing') {
      return { status: 'trial', label: 'Mois offert — rien à payer' }
    }
    if (paid) return { status: 'paid', label: 'Payé pour ce mois', invoiceId: paid.id }
    if (open) return { status: 'due', label: 'En attente de paiement', invoiceId: open.id }
    if (user.subscription?.status === 'active' && user.subscription?.hasPaymentMethod) {
      return { status: 'ok', label: 'À jour — prochain prélèvement prévu' }
    }
    if (user.subscription?.status === 'past_due' || user.subscription?.status === 'unpaid') {
      return { status: 'due', label: 'Paiement à régulariser' }
    }
    return { status: 'none', label: 'Aucune facture ce mois-ci' }
  } catch (err) {
    console.error('month payment status', err.message)
    return { status: 'unknown', label: 'Non disponible' }
  }
}

function resolveCommitmentEndsAt(sub = {}) {
  if (sub.commitmentEndsAt) return new Date(sub.commitmentEndsAt)
  if (sub.trialEndsAt) {
    const end = new Date(sub.trialEndsAt)
    end.setMonth(end.getMonth() + 6)
    return end
  }
  if (sub.activatedAt) {
    const end = new Date(sub.activatedAt)
    end.setMonth(end.getMonth() + 7)
    return end
  }
  return null
}

async function switchToInvoiceBilling(user) {
  const stripe = getStripe()
  const subId = user.subscription?.stripeSubscriptionId
  if (stripe && subId) {
    await stripe.subscriptions.update(subId, {
      collection_method: 'send_invoice',
      days_until_due: 3,
    })
  }
  if (!user.subscription) user.subscription = {}
  user.subscription.collectionMethod = 'send_invoice'
  user.subscription.billingChoice = 'invoice'
  user.subscription.billingChoiceAt = new Date()
  user.subscription.billingPromptSeenAt = new Date()
  await user.save()
  return user
}

async function changeMemberPlan(user, planId) {
  if (planId !== 'essentiel' && planId !== 'pro') {
    throw new Error('Formule invalide.')
  }
  const plan = getPlan(planId)
  if (!plan) throw new Error('Formule introuvable.')

  if (!user.subscription) user.subscription = {}
  const previous = user.subscription.plan || ''
  if (previous === planId) {
    return { user, changed: false }
  }

  const stripe = getStripe()
  const subId = user.subscription.stripeSubscriptionId
  if (stripe && subId) {
    const sub = await stripe.subscriptions.retrieve(subId)
    const itemId = sub.items?.data?.[0]?.id
    const price = await priceIdForPlan(planId)
    if (itemId) {
      await stripe.subscriptions.update(subId, {
        items: [{ id: itemId, price }],
        // Différence facturée tout de suite (upgrade Essentiel → Pro)
        proration_behavior: previous && planId === 'pro' ? 'always_invoice' : 'none',
        payment_behavior: 'pending_if_incomplete',
        metadata: {
          ...(sub.metadata || {}),
          noly_plan: planId,
          noly_user: String(user._id),
        },
      })

      if (previous && planId === 'pro') {
        try {
          const open = await latestOpenInvoice(user)
          if (open?.id && open.status === 'open' && (open.amount_due || 0) > 0) {
            const hasPm = await customerHasPaymentMethod(user.subscription.stripeCustomerId)
            if (hasPm) {
              const paid = await stripe.invoices.pay(open.id).catch(() => null)
              if (paid?.status === 'paid') {
                await recordFounderIncome(paid).catch(() => null)
              }
            }
          }
        } catch (err) {
          console.error('upgrade proration pay', err.message)
        }
      }
    }
    user.subscription.stripePriceId = price
  }

  user.subscription.plan = planId

  // Même compte : clients, agenda, notes… restent. On active juste les modules Pro.
  const { pickWorkspace } = require('../data/workspace')
  const currentWs = user.workspace?.toObject?.() || user.workspace || {}
  const currentModules = currentWs.modules || {}
  if (planId === 'pro') {
    user.workspace = pickWorkspace(
      {
        displayAs: currentWs.displayAs,
        modules: {
          ...currentModules,
          page: currentModules.page !== false,
          qr: currentModules.qr !== false,
          stats: currentModules.stats !== false,
        },
      },
      {
        plan: 'pro',
        tradeId: user.onboarding?.trade,
        workMode: user.onboarding?.workMode,
      },
    )
  } else {
    user.workspace = pickWorkspace(currentWs, {
      plan: 'essentiel',
      tradeId: user.onboarding?.trade,
      workMode: user.onboarding?.workMode,
    })
  }

  await user.save()
  return { user, changed: true, previous, plan: planId }
}

async function createCardSetupCheckout(user, { purpose = 'save_card', successPath = '/dashboard/parametres?carte=1' } = {}) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe n’est pas configuré.')
  const customerId = user.subscription?.stripeCustomerId
  if (!customerId) throw new Error('Aucun compte de facturation Stripe.')

  const origin = clientOrigin()
  const invoice = purpose === 'unlock' ? await latestOpenInvoice(user) : null
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    currency: 'eur',
    client_reference_id: String(user._id),
    success_url: `${origin}${successPath}${successPath.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      purpose === 'unlock' ? `${origin}/facture` : purpose === 'billing_prompt' ? `${origin}/dashboard` : `${origin}/dashboard/parametres`,
    metadata: {
      noly_user: String(user._id),
      stripe_invoice_id: invoice?.id || '',
      purpose: purpose === 'billing_prompt' ? 'save_card' : purpose,
      billing_choice: purpose === 'billing_prompt' || purpose === 'save_card' || purpose === 'unlock' ? 'auto' : '',
    },
  })
  return { url: session.url, sessionId: session.id }
}

async function createUnlockCheckout(user) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe n’est pas configuré.')
  const customerId = user.subscription?.stripeCustomerId
  if (!customerId) throw new Error('Aucun compte de facturation Stripe.')

  const invoice = await latestOpenInvoice(user)
  const hasPm = await customerHasPaymentMethod(customerId)

  // Carte déjà enregistrée : un seul prélèvement sur la facture Stripe ouverte
  if (hasPm && invoice && invoice.status === 'open') {
    try {
      const paid = await stripe.invoices.pay(invoice.id)
      if (paid.status === 'paid') {
        await recordFounderIncome(paid).catch(() => null)
        await markSubscriptionActive(user, { sendMail: true })
        return { alreadyPaid: true }
      }
    } catch (err) {
      console.error('auto pay open invoice', err.message)
      // fallback: setup / update card
    }
  }

  if (!invoice || !(invoice.amount_due > 0)) {
    // Pas de facture ouverte : enregistrer la carte pour les prochains prélèvements
    return createCardSetupCheckout(user, {
      purpose: 'unlock',
      successPath: '/facture?paid=1',
    })
  }

  // Une seule charge : on enregistre la carte puis on paye la facture Stripe existante (pas un 2e Checkout payment)
  return createCardSetupCheckout(user, {
    purpose: 'unlock',
    successPath: '/facture?paid=1',
  })
}

async function markSubscriptionActive(user, { paidAt = new Date(), sendMail = false } = {}) {
  if (!user.subscription) user.subscription = {}
  user.subscription.status = 'active'
  user.subscription.paidAt = paidAt
  if (!user.subscription.nextInvoiceAt && user.subscription.currentPeriodEnd) {
    user.subscription.nextInvoiceAt = user.subscription.currentPeriodEnd
  }
  await user.save()
  if (sendMail) {
    try {
      const { sendPaymentReceived } = require('./emails')
      await sendPaymentReceived(user)
    } catch (err) {
      console.error('payment mail', err.message)
    }
  }
  return user
}

async function applyUnlockFromCheckoutSession(user, sessionId) {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe n’est pas configuré.')
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['setup_intent', 'payment_intent'],
  })
  if (session.metadata?.noly_user && String(session.metadata.noly_user) !== String(user._id)) {
    throw new Error('Session de paiement invalide.')
  }
  if (session.client_reference_id && String(session.client_reference_id) !== String(user._id)) {
    throw new Error('Session de paiement invalide.')
  }

  // Setup : enregistrement carte → 1 seul paiement de la facture ouverte
  if (session.mode === 'setup') {
    if (session.status !== 'complete') return { user, paid: false, session }
    const setupIntent =
      typeof session.setup_intent === 'object' ? session.setup_intent : await stripe.setupIntents.retrieve(session.setup_intent)
    const pmId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id
    if (!pmId) return { user, paid: false, session }

    await enableAutoCharge(user, pmId)

    if (session.metadata?.billing_choice === 'auto' || session.metadata?.purpose === 'save_card' || session.metadata?.purpose === 'unlock') {
      user.subscription.billingChoice = 'auto'
      user.subscription.billingChoiceAt = new Date()
      user.subscription.billingPromptSeenAt = new Date()
    }

    const invoiceId = session.metadata?.stripe_invoice_id || (await latestOpenInvoice(user))?.id
    if (invoiceId) {
      const invoice = await stripe.invoices.retrieve(invoiceId)
      if (invoice.status === 'open') {
        const paid = await stripe.invoices.pay(invoiceId, { payment_method: pmId })
        await recordFounderIncome(paid).catch(() => null)
      } else if (invoice.status === 'paid') {
        await recordFounderIncome(invoice).catch(() => null)
      }
    }

    if (user.subscription?.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId)
        applySubscriptionSnapshot(user, sub)
      } catch (err) {
        console.error('sync after setup', err.message)
      }
    }

    const purpose = session.metadata?.purpose || 'unlock'
    if (purpose === 'unlock' || needsLocalUnlock(user)) {
      const wasLocked = user.subscription?.status !== 'active'
      await markSubscriptionActive(user, { sendMail: wasLocked })
      return { user, paid: true, session }
    }
    await user.save()
    return { user, paid: true, session }
  }

  // Ancien mode payment (éviter double débit) : activer seulement si déjà payé, sans repayer
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return { user, paid: false, session }
  }
  const invoiceId = session.metadata?.stripe_invoice_id
  if (invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId)
      if (invoice.status === 'open') {
        // Le Checkout a déjà encaissé : on marque la facture abonnement sans 2e charge
        await stripe.invoices.pay(invoiceId, { paid_out_of_band: true })
      }
      if (invoice.status === 'paid' || invoice.status === 'open') {
        await recordFounderIncome({
          ...invoice,
          amount_paid: invoice.amount_paid || invoice.amount_due || session.amount_total || 0,
          status: 'paid',
        }).catch(() => null)
      }
    } catch (err) {
      console.error('mark invoice paid', err.message)
    }
  }

  const pmFromPayment =
    typeof session.payment_intent === 'object' ? session.payment_intent?.payment_method : null
  if (pmFromPayment) await enableAutoCharge(user, pmFromPayment)

  if (user.subscription?.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId)
      applySubscriptionSnapshot(user, sub)
    } catch (err) {
      console.error('sync after checkout', err.message)
    }
  }

  const alreadyActive = user.subscription?.status === 'active' && user.subscription?.paidAt
  await markSubscriptionActive(user, { sendMail: !alreadyActive })
  return { user, paid: true, session }
}

function needsLocalUnlock(user) {
  const status = user.subscription?.status
  return status === 'past_due' || status === 'unpaid' || status === 'incomplete'
}

async function syncMemberBilling(user) {
  const stripe = getStripe()
  if (!stripe || !user?.subscription?.stripeCustomerId) {
    return user
  }

  user.subscription.hasPaymentMethod = await customerHasPaymentMethod(user.subscription.stripeCustomerId)

  if (user.subscription.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId)
      applySubscriptionSnapshot(user, sub)
    } catch (err) {
      console.error('sync subscription', err.message)
    }
  }

  const invoices = await stripe.invoices.list({
    customer: user.subscription.stripeCustomerId,
    limit: 8,
  })
  const openDue = invoices.data.find((item) => item.status === 'open' && (item.amount_due || 0) > 0)
  const paid = invoices.data.find((item) => item.status === 'paid' && (item.amount_paid || 0) > 0)

  if (!openDue && paid && needsLocalUnlock(user)) {
    await markSubscriptionActive(user, { sendMail: !user.subscription.paidAt })
  } else {
    await user.save()
  }
  return user
}

async function latestHostedInvoiceUrl(user) {
  const stripe = getStripe()
  if (!stripe || !user?.subscription?.stripeCustomerId) return ''
  const invoices = await stripe.invoices.list({
    customer: user.subscription.stripeCustomerId,
    limit: 5,
  })
  const open = invoices.data.find((item) => item.status === 'open' && item.hosted_invoice_url)
  return open?.hosted_invoice_url || invoices.data.find((item) => item.hosted_invoice_url)?.hosted_invoice_url || ''
}

async function attachDefaultPaymentMethod(invoice) {
  const stripe = getStripe()
  if (!stripe || !invoice.payment_intent || !invoice.customer) return
  const intent =
    typeof invoice.payment_intent === 'string'
      ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
      : invoice.payment_intent
  const paymentMethod = intent?.payment_method
  if (!paymentMethod) return
  const pmId = typeof paymentMethod === 'string' ? paymentMethod : paymentMethod.id
  await stripe.customers.update(String(invoice.customer), {
    invoice_settings: { default_payment_method: pmId },
  })
  const user = await User.findOne({ 'subscription.stripeCustomerId': String(invoice.customer) })
  const subId = user?.subscription?.stripeSubscriptionId
  if (subId) {
    await stripe.subscriptions.update(subId, {
      default_payment_method: pmId,
      collection_method: 'charge_automatically',
    })
  }
}

function invoiceFileLabel(user, invoice) {
  const parts = String(user?.name || '').trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] || 'Client'
  const lastName = parts.slice(1).join(' ') || ''
  const when = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000)
    : invoice.created
      ? new Date(invoice.created * 1000)
      : new Date()
  const month = when.toLocaleDateString('fr-FR', { month: 'long' })
  const year = when.getFullYear()
  const person = [firstName, lastName].filter(Boolean).join(' ')
  return `${person} - ${month} ${year}`
}

async function listInvoicesForUser(user) {
  const stripe = getStripe()
  if (!stripe || !user?.subscription?.stripeCustomerId) return []
  const result = await stripe.invoices.list({
    customer: user.subscription.stripeCustomerId,
    limit: 24,
  })
  return result.data
    .filter((invoice) => (invoice.amount_paid || invoice.amount_due || 0) > 0)
    .map((invoice) => {
      const paidAt = invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null
      const createdAt = invoice.created ? new Date(invoice.created * 1000) : null
      return {
        id: invoice.id,
        number: invoice.number || '',
        status: invoice.status,
        amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
        currency: (invoice.currency || 'eur').toUpperCase(),
        paidAt,
        createdAt,
        hostedInvoiceUrl: invoice.hosted_invoice_url || '',
        hasPdf: Boolean(invoice.invoice_pdf),
        fileName: `${invoiceFileLabel(user, invoice)}.pdf`,
        label: invoiceFileLabel(user, invoice),
      }
    })
}

async function downloadInvoicePdf(user, invoiceId) {
  const stripe = getStripe()
  if (!stripe || !user?.subscription?.stripeCustomerId) return null
  const invoice = await stripe.invoices.retrieve(invoiceId)
  if (String(invoice.customer) !== String(user.subscription.stripeCustomerId)) return null
  if (!invoice.invoice_pdf) return null
  const response = await fetch(invoice.invoice_pdf)
  if (!response.ok) return null
  const buffer = Buffer.from(await response.arrayBuffer())
  return {
    buffer,
    fileName: `${invoiceFileLabel(user, invoice)}.pdf`,
    contentType: 'application/pdf',
  }
}

module.exports = {
  stripeEnabled,
  getStripe,
  addDays,
  createCustomerForRequest,
  startMemberSubscription,
  syncUserFromSubscription,
  recordFounderIncome,
  latestHostedInvoiceUrl,
  latestOpenInvoice,
  createUnlockCheckout,
  createCardSetupCheckout,
  switchToInvoiceBilling,
  changeMemberPlan,
  removeCustomerPaymentMethods,
  getPaymentMethodSummary,
  getCurrentMonthPaymentStatus,
  resolveCommitmentEndsAt,
  applyUnlockFromCheckoutSession,
  syncMemberBilling,
  markSubscriptionActive,
  enableAutoCharge,
  customerHasPaymentMethod,
  attachDefaultPaymentMethod,
  findUserForStripe,
  applySubscriptionSnapshot,
  localStatusFromStripe,
  listInvoicesForUser,
  downloadInvoicePdf,
  invoiceFileLabel,
}
