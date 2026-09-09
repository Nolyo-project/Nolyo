export const plans = [
  {
    id: 'essentiel',
    name: 'Nolyo Essentiel',
    price: 9.99,
    period: 'mois',
    audience: 'Tout pour gérer votre activité, en privé.',
    trial: '1er mois offert',
    commitmentMonths: 6,
    totalMonths: 7,
    commitment: 'Engagement 6 mois',
    features: [
      'Tableau de bord privé',
      'Clients et prospects',
      'Agenda',
      'Notes et tâches',
      'Revenus, mois par mois',
      'Relances clients',
      'Paiement Stripe sécurisé',
    ],
  },
  {
    id: 'pro',
    name: 'Nolyo Pro',
    price: 19.99,
    period: 'mois',
    audience: 'Le tableau de bord + votre page pour être trouvé et réserver.',
    featured: true,
    trial: '1er mois offert',
    commitmentMonths: 6,
    totalMonths: 7,
    commitment: 'Engagement 6 mois',
    features: [
      'Tout Nolyo Essentiel',
      'Page professionnelle (accueil & à propos)',
      'Réservation et devis en ligne',
      'Congés (fermeture de la réservation)',
      'Photos, couleurs, équipe',
      'QR Code vers votre page',
      'Avis clients modérés',
      'Statistiques',
      'Dépenses et cotisations',
      'Paiement Stripe sécurisé',
    ],
  },
]

export const planLabels = {
  essentiel: 'Nolyo Essentiel',
  pro: 'Nolyo Pro',
}

export const trialNote =
  'Le premier mois est offert. Ensuite, un engagement de 6 mois. Soit 7 mois au total.'

export const trialShort = '1er mois offert, puis 6 mois d’engagement — 7 mois au total'

export const paymentNote =
  'Paiements sécurisés via Stripe : prélèvement automatique, ou règlement manuel chaque mois.'

export function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

/** Pro réel, ou essai 5 min lancé en mode Pro. */
export function isProPlan(user) {
  if (user?.preview) {
    return (user.previewPlan || user.subscription?.plan || 'pro') === 'pro'
  }
  return user?.subscription?.plan === 'pro'
}
