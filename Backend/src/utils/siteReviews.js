const SiteReview = require('../models/SiteReview')

const SEED = [
  {
    authorName: 'Léa Moreau',
    role: 'Graphiste indépendante',
    place: 'Lyon',
    rating: 5,
    body: 'Avant, mes relances vivaient dans trois carnets. Nolyo me montre qui attendre, qui relancer, et ce qui rentre ce mois-ci — sans me transformer en comptable.',
  },
  {
    authorName: 'Karim El Amrani',
    role: 'Consultant',
    place: 'Paris',
    rating: 5,
    body: 'On a remplacé le tableur, le calendrier et la boîte mail éparpillée. Moins de bruit, plus de décisions. L’équipe s’y est mise en une journée.',
  },
  {
    authorName: 'Camille Roux',
    role: 'Coach professionnelle',
    place: 'Nantes',
    rating: 5,
    body: 'Mes prospects ne se perdent plus. Un rendez-vous, une note, une relance : tout reste au même endroit. Je retrouve enfin le fil de la semaine.',
  },
  {
    authorName: 'Thomas Berger',
    role: 'Artisan',
    place: 'Bordeaux',
    rating: 5,
    body: 'Je n’avais pas besoin d’un logiciel de gestion. Juste de voir mes clients, mes chantiers et ce qui reste à encaisser. Nolyo fait exactement ça.',
  },
  {
    authorName: 'Sofia Martins',
    role: 'Photographe',
    place: 'Lisbonne & Paris',
    rating: 5,
    body: 'Les demandes Instagram se perdaient. Maintenant je les centralise, je note le brief, je pose le RDV. Le premier mois offert m’a laissé le temps de m’y faire.',
  },
  {
    authorName: 'Inès Benali',
    role: 'Architecte d’intérieur',
    place: 'Marseille',
    rating: 5,
    body: 'J’ai une vue simple : qui relancer, quel devis attend, ce qui est déjà payé. Plus de dimanche soir à reconstruire le mois dans un tableur.',
  },
  {
    authorName: 'Julien Capel',
    role: 'Formateur',
    place: 'Lille',
    rating: 5,
    body: 'Les rappels partent au bon moment, les notes de séance restent collées au client. C’est calme, lisible, et ça ne me demande pas d’apprendre un métier en plus.',
  },
  {
    authorName: 'Nadia Petit',
    role: 'Thérapeute',
    place: 'Toulouse',
    rating: 5,
    body: 'L’agenda et le carnet client se parlent enfin. Je vois la semaine d’un coup d’œil, sans empiler les applis. C’est devenu le réflexe du matin.',
  },
]

async function ensureSeedSiteReviews() {
  // Pas de seed automatique : les avis viennent uniquement des visiteurs (modérés).
}

function publicSiteReview(item) {
  return {
    id: String(item._id),
    name: item.authorName,
    role: item.role || '',
    place: item.place || '',
    rating: item.rating,
    text: item.body,
    createdAt: item.createdAt,
  }
}

function presidentSiteReview(item) {
  return {
    id: String(item._id),
    authorName: item.authorName,
    role: item.role || '',
    place: item.place || '',
    authorEmail: item.authorEmail || '',
    rating: item.rating,
    body: item.body,
    status: item.status,
    createdAt: item.createdAt,
  }
}

async function siteReviewStats() {
  const approved = await SiteReview.find({ status: 'approved' }).select('rating').lean()
  if (!approved.length) return { rating: 0, count: 0 }
  const sum = approved.reduce((acc, item) => acc + Number(item.rating || 0), 0)
  return {
    rating: Math.round((sum / approved.length) * 10) / 10,
    count: approved.length,
  }
}

module.exports = {
  ensureSeedSiteReviews,
  publicSiteReview,
  presidentSiteReview,
  siteReviewStats,
  SEED,
}
