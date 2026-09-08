export const plans = [
  {
    id: 'essentiel',
    name: 'Nolyo Essentiel',
    price: 9.99,
    period: 'mois',
    audience: 'Pour démarrer, en interne',
    trial: '1er mois offert',
    commitmentMonths: 6,
    totalMonths: 7,
    commitment: 'Engagement 6 mois',
    features: [
      'Tableau de bord privé',
      'Clients et prospects',
      'Notes',
      'Agenda',
      'Revenus, un mois à la fois',
      'Relances',
      'Connexion e-mail',
    ],
  },
  {
    id: 'pro',
    name: 'Nolyo Pro',
    price: 19.99,
    period: 'mois',
    audience: 'Tableau de bord + page professionnelle',
    featured: true,
    trial: '1er mois offert',
    commitmentMonths: 6,
    totalMonths: 7,
    commitment: 'Engagement 6 mois',
    features: [
      'Tout Nolyo Essentiel',
      'Page d’accueil et à propos (votre vitrine)',
      'Photos, couleurs, présentation de l’équipe',
      'Réservation et devis en ligne',
      'QR Code vers votre page',
      'Boîte de réception (Instagram, Facebook, e-mail)',
      'Statistiques',
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

export function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

export function isProPlan(user) {
  return user?.preview === true || user?.subscription?.plan === 'pro'
}
