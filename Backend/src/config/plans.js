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
    trialDays: 30,
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

function getPlan(id) {
  return plans.find((plan) => plan.id === id) || null
}

const TRIAL_DAYS = 30

module.exports = { plans, getPlan, TRIAL_DAYS }
