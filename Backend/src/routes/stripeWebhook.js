const { sendInvoiceReady, sendPaymentFailed } = require('../utils/emails')
const {
  getStripe,
  stripeEnabled,
  syncUserFromSubscription,
  recordFounderIncome,
  attachDefaultPaymentMethod,
  findUserForStripe,
  markSubscriptionActive,
  applyUnlockFromCheckoutSession,
} = require('../utils/stripe')
const User = require('../models/User')

async function handleStripeWebhook(req, res) {
  if (!stripeEnabled()) return res.status(404).json({ error: 'Stripe n’est pas configuré.' })
  const stripe = getStripe()
  const signature = req.headers['stripe-signature']
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')

  if (!secret) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET manquant')
    return res.status(500).json({ error: 'Webhook Stripe mal configuré.' })
  }
  if (!signature) {
    console.error('Stripe webhook: en-tête stripe-signature absent')
    return res.status(400).json({ error: 'Signature Stripe absente.' })
  }

  // constructEvent exige le payload exact reçu (Buffer), pas un objet JSON déjà parsé
  let payload = req.body
  if (!Buffer.isBuffer(payload)) {
    console.error('Stripe webhook: body non brut', typeof payload)
    if (typeof payload === 'string') payload = Buffer.from(payload, 'utf8')
    else payload = Buffer.from(JSON.stringify(payload ?? {}), 'utf8')
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (err) {
    console.error('Stripe webhook signature', err.message, {
      bodyIsBuffer: Buffer.isBuffer(req.body),
      bodyBytes: Buffer.isBuffer(payload) ? payload.length : 0,
      secretLen: secret.length,
      secretLooksValid: secret.startsWith('whsec_'),
      hasSignature: Boolean(signature),
    })
    return res.status(400).json({ error: 'Signature Stripe invalide.' })
  }

  try {
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await syncUserFromSubscription(event.data.object)
    }

    if (event.type === 'invoice.finalized' || event.type === 'invoice.sent') {
      const invoice = event.data.object
      if ((invoice.amount_due || 0) > 0) {
        const user = await findUserForStripe({
          customerId: String(invoice.customer),
          userId: invoice.subscription_details?.metadata?.noly_user || invoice.metadata?.noly_user,
          subscriptionId: String(invoice.subscription || ''),
        })
        if (
          user &&
          user.subscription?.status === 'trialing' &&
          user.subscription.trialEndsAt &&
          new Date(user.subscription.trialEndsAt) <= new Date() &&
          !user.subscription.hasPaymentMethod
        ) {
          user.subscription.status = 'past_due'
          await user.save()
        }
        if (user && !user.subscription?.invoiceNoticeAt) {
          await sendInvoiceReady(user, invoice)
          user.subscription.invoiceNoticeAt = new Date()
          await user.save()
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      const user = await findUserForStripe({
        customerId: String(invoice.customer),
        userId: invoice.metadata?.noly_user || invoice.subscription_details?.metadata?.noly_user,
        subscriptionId: String(invoice.subscription || ''),
      })
      if (user) {
        const wasOpen = user.subscription?.status === 'active' || user.subscription?.status === 'trialing'
        user.subscription.status = 'past_due'
        await user.save()
        if (wasOpen) {
          await sendPaymentFailed(user, invoice).catch((err) => console.error('mail payment_failed', err.message))
        }
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object
      if ((invoice.amount_paid || 0) > 0 || invoice.paid) {
        const user = await findUserForStripe({
          customerId: String(invoice.customer),
          userId: invoice.metadata?.noly_user,
          subscriptionId: String(invoice.subscription || ''),
        })
        if (user) {
          const wasLocked = user.subscription?.status !== 'active'
          await markSubscriptionActive(user, { sendMail: wasLocked })
        }
        await recordFounderIncome(invoice)
        // Ne force pas le prélèvement auto si le membre a choisi le paiement manuel
        if (user?.subscription?.billingChoice !== 'invoice') {
          await attachDefaultPaymentMethod(invoice).catch((err) => console.error('PM attach', err.message))
        }
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const purpose = session.metadata?.purpose
      if (purpose === 'unlock' || purpose === 'save_card' || session.mode === 'payment') {
        const user =
          (await findUserForStripe({
            customerId: String(session.customer || ''),
            userId: session.metadata?.noly_user || session.client_reference_id,
          })) || (session.client_reference_id ? await User.findById(session.client_reference_id) : null)
        if (user && (purpose === 'unlock' || purpose === 'save_card' || session.metadata?.stripe_invoice_id)) {
          await applyUnlockFromCheckoutSession(user, session.id)
        }
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler', err)
    return res.status(500).json({ error: 'Webhook Stripe en échec.' })
  }

  return res.json({ received: true })
}

module.exports = { handleStripeWebhook }
