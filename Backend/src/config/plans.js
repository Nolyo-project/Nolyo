const plans = [
  {
    id: 'essentiel',
    name: 'Nolio Essentiel',
    price: 4.99,
    period: 'mois',
    audience: 'Pour démarrer',
    trial: '1er mois offert',
    features: [
      'Tableau de bord',
      'Client & Prospect',
      'Notes',
      'Rendez-vous',
      'Revenus & Dépenses',
      'Estimations indicatives des cotisations',
      'Rappel & relance',
      'Connexion email',
    ],
  },
  {
    id: 'pro',
    name: 'Nolio Pro',
    price: 9.99,
    period: 'mois',
    audience: 'Pour aller plus loin',
    featured: true,
    trial: '1er mois offert',
    features: [
      'Tout Nolio Essentiel',
      'Boîte de réception centralisée (Instagram, Facebook, Email)',
      'Statistiques avancées',
      'Plusieurs connexions',
    ],
  },
]

function getPlan(id) {
  return plans.find((plan) => plan.id === id) || null
}

module.exports = { plans, getPlan }
