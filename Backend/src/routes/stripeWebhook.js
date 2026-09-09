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
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature', err.message)
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
      if ((invoice.amount_paid || 0) > 0) {
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
        await attachDefaultPaymentMethod(invoice).catch((err) => console.error('PM attach', err.message))
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const purpose = session.metadata?.purpose
      if (purpose === 'unlock' || purpose === 'save_card') {
        const user =
          (await findUserForStripe({
            customerId: String(session.customer || ''),
            userId: session.metadata?.noly_user || session.client_reference_id,
          })) || (session.client_reference_id ? await User.findById(session.client_reference_id) : null)
        if (user) {
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
