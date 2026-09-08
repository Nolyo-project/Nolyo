const TRADES = {
  wellness: {
    id: 'wellness',
    label: 'Bien-être & soins',
    hint: 'Massage, yoga, naturopathie, rituels…',
    navGroup: 'Salon',
    appointments: 'Séances',
    clients: 'Suivi client',
    prospects: 'Demandes',
    aboutKicker: 'À propos',
    bookingCta: 'Réserver une séance',
    contactKicker: 'Venir, réserver',
    overviewHint: 'Vos soins, vos clients, sans bruit.',
    clientsHint: 'Les personnes que vous recevez. Prestations, suivi, fin de soin.',
    prospectsHint: 'Celles et ceux qui ont écrit. Quand c’est bon, passez-les en client.',
    schedule: { workStart: '09:00', workEnd: '19:00', durationMinutes: 60, workDays: [1, 2, 3, 4, 5, 6] },
    depositPlan: [
      { label: 'Réservation', percent: 30 },
      { label: 'Fin de soin', percent: 70 },
    ],
    services: [
      { name: 'Soin visage', price: 75, durationMinutes: 60 },
      { name: 'Massage', price: 90, durationMinutes: 75 },
      { name: 'Rituel découverte', price: 45, durationMinutes: 45 },
    ],
    pageTitle: (company, city) =>
      city ? `${company} — soins et rituels, à ${city}` : `${company} — soins et rituels`,
    pageDescription: (firstName, company, city) =>
      `Un lieu calme, pour se poser.\n\n${firstName} reçoit sur rendez-vous, une personne à la fois. Soins, massages, rituels : le temps est pris, sans bruit.${city ? ` ${company} est à ${city}.` : ''}\n\nPremier échange offert, carte claire, places limitées.`,
  },
  beauty: {
    id: 'beauty',
    label: 'Beauté & coiffure',
    hint: 'Salon, manucure, maquillage, barber…',
    navGroup: 'Salon',
    appointments: 'Rendez-vous',
    clients: 'Suivi client',
    prospects: 'Demandes',
    aboutKicker: 'À propos',
    bookingCta: 'Prendre rendez-vous',
    contactKicker: 'Venir, réserver',
    overviewHint: 'Votre salon, vos clients, l’essentiel.',
    clientsHint: 'Les personnes que vous recevez. Prestations, passages, fidélité.',
    prospectsHint: 'Les demandes en attente. Quand c’est bon, passez-les en client.',
    schedule: { workStart: '09:00', workEnd: '19:00', durationMinutes: 45, workDays: [1, 2, 3, 4, 5, 6] },
    depositPlan: [
      { label: 'Acompte', percent: 30 },
      { label: 'Solde', percent: 70 },
    ],
    services: [
      { name: 'Coupe', price: 45, durationMinutes: 45 },
      { name: 'Couleur', price: 85, durationMinutes: 90 },
      { name: 'Soin', price: 35, durationMinutes: 30 },
    ],
    pageTitle: (company, city) => (city ? `${company} — ${city}` : company),
    pageDescription: (firstName, company, city) =>
      `${company} est un salon où l’on prend le temps.${city ? ` À ${city}.` : ''}\n\n${firstName} reçoit sur rendez-vous. Coupe, couleur, soins : une carte claire, une table à la fois.\n\nRéservation en ligne, places limitées.`,
  },
  creative: {
    id: 'creative',
    label: 'Création & image',
    hint: 'Photo, vidéo, graphisme, illustration…',
    navGroup: 'Studio',
    appointments: 'Séances',
    clients: 'Clients',
    prospects: 'Prospects',
    aboutKicker: 'À propos',
    bookingCta: 'Réserver une séance',
    contactKicker: 'Écrire, réserver',
    overviewHint: 'Vos projets, vos séances, sans bruit.',
    clientsHint: 'Les dossiers en cours. Devis, acomptes, livrables.',
    prospectsHint: 'Les demandes à relancer. Quand c’est bon, passez-les en client.',
    schedule: { workStart: '10:00', workEnd: '18:00', durationMinutes: 90, workDays: [1, 2, 3, 4, 5] },
    depositPlan: [
      { label: 'Acompte', percent: 40 },
      { label: 'Solde', percent: 60 },
    ],
    services: [
      { name: 'Demande de devis', price: 0, durationMinutes: 30, kind: 'quote' },
      { name: 'Séance portrait', price: 280, durationMinutes: 90 },
      { name: 'Reportage demi-journée', price: 650, durationMinutes: 240 },
      { name: 'Retouches', price: 90, durationMinutes: 60 },
    ],
    pageTitle: (company, city) => (city ? `${company} — studio à ${city}` : `${company} — studio`),
    pageDescription: (firstName, company, city) =>
      `${company} est un studio indépendant.${city ? ` Basé à ${city}.` : ''}\n\n${firstName} travaille sur rendez-vous et au projet : portraits, reportages, images pour les marques et les personnes.\n\nUn premier échange pour cadrer, puis un devis clair.`,
  },
  craft: {
    id: 'craft',
    label: 'Artisanat',
    hint: 'Céramique, bois, couture, restauration…',
    navGroup: 'Atelier',
    appointments: 'Rendez-vous',
    clients: 'Clients',
    prospects: 'Demandes',
    aboutKicker: 'À propos',
    bookingCta: 'Prendre rendez-vous',
    contactKicker: 'Venir, écrire',
    overviewHint: 'Votre atelier, vos commandes, l’essentiel.',
    clientsHint: 'Les commandes en cours. Devis, acomptes, livraison.',
    prospectsHint: 'Les demandes à relancer. Quand c’est bon, passez-les en client.',
    schedule: { workStart: '09:00', workEnd: '18:00', durationMinutes: 60, workDays: [1, 2, 3, 4, 5, 6] },
    depositPlan: [
      { label: 'Acompte', percent: 40 },
      { label: 'Solde', percent: 60 },
    ],
    services: [
      { name: 'Demande de devis', price: 0, durationMinutes: 30, kind: 'quote' },
      { name: 'Pièce sur mesure', price: 180, durationMinutes: 60 },
      { name: 'Atelier découverte', price: 65, durationMinutes: 90 },
      { name: 'Réparation', price: 50, durationMinutes: 45 },
    ],
    pageTitle: (company, city) => (city ? `${company} — atelier à ${city}` : `${company} — atelier`),
    pageDescription: (firstName, company, city) =>
      `${company} est un atelier indépendant.${city ? ` À ${city}.` : ''}\n\n${firstName} conçoit, répare et reçoit sur rendez-vous. Pièces sur mesure, ateliers, commandes — le travail se fait à la main, sans précipitation.\n\nUn premier échange pour parler du projet.`,
  },
  coaching: {
    id: 'coaching',
    label: 'Coaching & formation',
    hint: 'Coach, formateur, accompagnement…',
    navGroup: 'Cabinet',
    appointments: 'Séances',
    clients: 'Clients',
    prospects: 'Prospects',
    aboutKicker: 'À propos',
    bookingCta: 'Réserver une séance',
    contactKicker: 'Écrire, réserver',
    overviewHint: 'Vos séances, vos suivis, sans bruit.',
    clientsHint: 'Les personnes que vous accompagnez. Séances, forfaits, suivi.',
    prospectsHint: 'Les prises de contact. Quand c’est bon, passez-les en client.',
    schedule: { workStart: '09:00', workEnd: '18:00', durationMinutes: 60, workDays: [1, 2, 3, 4, 5] },
    depositPlan: [
      { label: 'Réservation', percent: 30 },
      { label: 'Séance', percent: 70 },
    ],
    services: [
      { name: 'Demande de devis', price: 0, durationMinutes: 30, kind: 'quote' },
      { name: 'Séance individuelle', price: 90, durationMinutes: 60 },
      { name: 'Bilan', price: 140, durationMinutes: 90 },
      { name: 'Atelier', price: 220, durationMinutes: 180 },
    ],
    pageTitle: (company, city) => (city ? `${company} — ${city}` : company),
    pageDescription: (firstName, company, city) =>
      `${firstName} accompagne les personnes et les équipes, un entretien à la fois.${city ? ` À ${city} et à distance.` : ' En présentiel et à distance.'}\n\n${company} : un cadre clair, des séances posées, un suivi sans jargon.\n\nPremier échange offert pour voir si ça correspond.`,
  },
  consulting: {
    id: 'consulting',
    label: 'Conseil & freelance',
    hint: 'Consultant, développeur, indépendant…',
    navGroup: 'Cabinet',
    appointments: 'Rendez-vous',
    clients: 'Clients',
    prospects: 'Prospects',
    aboutKicker: 'À propos',
    bookingCta: 'Prendre rendez-vous',
    contactKicker: 'Écrire',
    overviewHint: 'Vos missions, vos rendez-vous, l’essentiel.',
    clientsHint: 'Les missions en cours. Devis, acomptes, livrables.',
    prospectsHint: 'Les pistes à relancer. Quand c’est bon, passez-les en client.',
    schedule: { workStart: '09:00', workEnd: '18:00', durationMinutes: 60, workDays: [1, 2, 3, 4, 5] },
    depositPlan: [
      { label: 'Acompte', percent: 40 },
      { label: 'Solde', percent: 60 },
    ],
    services: [
      { name: 'Demande de devis', price: 0, durationMinutes: 30, kind: 'quote' },
      { name: 'Mission demi-journée', price: 450, durationMinutes: 240 },
      { name: 'Accompagnement mensuel', price: 900, durationMinutes: 60 },
    ],
    pageTitle: (company, city) => (city ? `${company} — ${city}` : company),
    pageDescription: (firstName, company, city) =>
      `${company} est un cabinet indépendant.${city ? ` Basé à ${city}.` : ''}\n\n${firstName} intervient au projet : diagnostic, accompagnement, livrables clairs. Un premier échange pour cadrer, puis un devis.\n\nTravail à distance ou sur place.`,
  },
  health: {
    id: 'health',
    label: 'Santé & thérapie',
    hint: 'Ostéo, psycho, naturo, sophrologie…',
    navGroup: 'Cabinet',
    appointments: 'Consultations',
    clients: 'Patients',
    prospects: 'Demandes',
    aboutKicker: 'À propos',
    bookingCta: 'Prendre rendez-vous',
    contactKicker: 'Venir, écrire',
    overviewHint: 'Vos consultations, vos suivis, sans bruit.',
    clientsHint: 'Les personnes que vous suivez. Séances, acomptes, relances.',
    prospectsHint: 'Les demandes de rendez-vous. Quand c’est bon, passez-les en patient.',
    schedule: { workStart: '08:30', workEnd: '19:00', durationMinutes: 45, workDays: [1, 2, 3, 4, 5] },
    depositPlan: [
      { label: 'Consultation', percent: 100 },
    ],
    services: [
      { name: 'Consultation', price: 60, durationMinutes: 45 },
      { name: 'Suivi', price: 55, durationMinutes: 45 },
      { name: 'Première séance', price: 80, durationMinutes: 60 },
    ],
    pageTitle: (company, city) => (city ? `${company} — cabinet à ${city}` : `${company} — cabinet`),
    pageDescription: (firstName, company, city) =>
      `${firstName} reçoit en cabinet, sur rendez-vous.${city ? ` À ${city}.` : ''}\n\nUn temps posé, une personne à la fois. ${company} : consultations et suivis, sans précipitation.\n\nPrise de rendez-vous en ligne.`,
  },
  other: {
    id: 'other',
    label: 'Autre métier',
    hint: 'Indépendant, activité libre…',
    navGroup: 'Atelier',
    appointments: 'Rendez-vous',
    clients: 'Clients',
    prospects: 'Prospects',
    aboutKicker: 'À propos',
    bookingCta: 'Prendre rendez-vous',
    contactKicker: 'Venir, écrire',
    overviewHint: 'L’essentiel, sans bruit.',
    clientsHint: 'Devis envoyé, devis signé, acomptes, solde. Cliquez une carte pour suivre le dossier.',
    prospectsHint: 'Les personnes à démarcher. Quand c’est bon, passez-les en client.',
    schedule: { workStart: '09:00', workEnd: '18:00', durationMinutes: 60, workDays: [1, 2, 3, 4, 5] },
    depositPlan: [
      { label: 'Acompte', percent: 30 },
      { label: 'Solde', percent: 70 },
    ],
    services: [
      { name: 'Demande de devis', price: 0, durationMinutes: 30, kind: 'quote' },
      { name: 'Prestation', price: 80, durationMinutes: 60 },
      { name: 'Forfait', price: 180, durationMinutes: 90 },
    ],
    pageTitle: (company, city) => (city ? `${company} — ${city}` : company),
    pageDescription: (firstName, company, city) =>
      `${company} est une activité indépendante.${city ? ` À ${city}.` : ''}\n\n${firstName} reçoit et travaille sur rendez-vous. Un premier échange pour cadrer, puis une proposition claire.`,
  },
}

const TRADE_IDS = Object.keys(TRADES)
const WORK_MODES = ['appointments', 'projects', 'mix']

function getTrade(id) {
  return TRADES[id] || TRADES.other
}

function publicTrades() {
  return TRADE_IDS.map((id) => {
    const trade = TRADES[id]
    return {
      id: trade.id,
      label: trade.label,
      hint: trade.hint,
      services: trade.services,
    }
  })
}

module.exports = { TRADES, TRADE_IDS, WORK_MODES, getTrade, publicTrades }
