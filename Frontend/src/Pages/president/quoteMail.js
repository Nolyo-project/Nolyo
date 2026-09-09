import { planLabels, plans, formatPrice } from '../../data/plans'

function firstName(full) {
  return String(full || '').trim().split(/\s+/)[0] || ''
}

function planLine(request) {
  const plan = plans.find((item) => item.id === request.plan)
  const name = plan?.name || planLabels[request.plan] || 'Nolyo'
  const price = plan ? formatPrice(plan.price) : ''
  if (price) return `${name} — ${price} / mois`
  return name
}

export function quoteEmailDraft(request) {
  const name = firstName(request.name)
  const formule = planLine(request)
  const subject = 'Votre abonnement Nolyo - Premier mois offert'
  const body = `Bonjour ${name},

Comme convenu, vous trouverez votre devis Nolyo en pièce jointe à cet e-mail.

Celui-ci reprend votre abonnement ainsi que les conditions associées à votre offre.

Votre formule : ${formule}

Votre premier mois Nolyo est offert. Vous n’avez donc aucun règlement à effectuer pour commencer.

Pour valider votre abonnement, il vous suffit de nous retourner le devis signé.

Une fois le devis signé et reçu, nous vous transmettrons votre code d’accès unique vous permettant de créer votre compte Nolyo et de commencer à utiliser la plateforme.

À l’issue de votre premier mois offert, votre abonnement sera facturé selon les conditions indiquées sur le devis (${formule} après le mois offert).

Si vous avez la moindre question concernant votre abonnement ou le fonctionnement de Nolyo, je reste bien entendu disponible pour vous répondre.

À très bientôt sur Nolyo !

Florentin
Fondateur de Nolyo`
  return { subject, body, to: request.email }
}

export function gmailComposeUrl({ to, subject, body }) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: to || '',
    su: subject || '',
    body: body || '',
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function openQuoteInGmail(request) {
  const draft = quoteEmailDraft(request)
  window.open(gmailComposeUrl(draft), '_blank', 'noopener,noreferrer')
  return draft
}
