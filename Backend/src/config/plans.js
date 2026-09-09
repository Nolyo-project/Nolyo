const plans = [
  {
    id: 'essentiel',
    name: 'Nolyo Essentiel',
    price: 9.99,
    period: 'mois',
    audience: 'Tout pour gérer votre activité, en privé.',
    trial: '1er mois offert',
    trialDays: 30,
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
    trialDays: 30,
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

function getPlan(id) {
  return plans.find((plan) => plan.id === id) || null
}

const TRIAL_DAYS = 30

module.exports = { plans, getPlan, TRIAL_DAYS }
