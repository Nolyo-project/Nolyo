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
      'Fiches clients & historique',
      'Prospects et suivi',
      'Agenda et rendez-vous',
      'Notes et tâches',
      'Chiffre d’affaires, mois par mois',
      'Relances clients',
      'Paiement sécurisé Stripe',
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
      'Page professionnelle personnalisée',
      'Réservations en ligne 24h/24',
      'Vos clients réservent sans créer de compte',
      'Demandes de devis en ligne',
      'Ajout au calendrier (Google & Apple)',
      'Congés : fermeture auto de la réservation',
      'QR Code vers votre page',
      'Avis clients modérés',
      'Tableau de bord & statistiques',
      'Dépenses et cotisations',
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
