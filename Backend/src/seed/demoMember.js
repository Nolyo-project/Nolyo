const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const DayLog = require('../models/DayLog')
const InboxItem = require('../models/InboxItem')
const Note = require('../models/Note')
const Reminder = require('../models/Reminder')
const Transaction = require('../models/Transaction')
const User = require('../models/User')

function toDateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const day = new Date(date)
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function seedDemoWorkspace(user) {
  const existing = await Contact.countDocuments({ user: user._id })
  if (existing > 0) return

  const [dupont, atelier, clinique, verde] = await Contact.create([
    {
      user: user._id,
      name: 'Claire Dupont',
      email: 'claire.dupont@maison-dupont.fr',
      phone: '06 12 44 18 90',
      company: 'Maison Dupont',
      kind: 'client',
      price: 1860,
      nextAction: 'Relancer la facture de mars',
      notes: 'Identité visuelle + papeterie. Paiement habituellement sous 15 jours.',
    },
    {
      user: user._id,
      name: 'Hugo Fernandes',
      email: 'hugo@atelier-nord.com',
      phone: '07 81 22 09 44',
      company: 'Atelier Nord',
      kind: 'client',
      price: 2400,
      nextAction: 'Envoyer le devis site vitrine',
      notes: 'Contact via Instagram. Budget autour de 2 400 €.',
    },
    {
      user: user._id,
      name: 'Dr. Martin',
      email: 'accueil@clinique-martin.fr',
      company: 'Clinique Martin',
      kind: 'client',
      price: 1440,
      nextAction: 'RDV brief photos',
      notes: 'Série portraits équipe + accueil.',
    },
    {
      user: user._id,
      name: 'Inès Verde',
      email: 'ines@maisonverde.fr',
      company: 'Maison Verde',
      kind: 'client',
      price: 890,
      nextAction: 'Rappeler mercredi',
      notes: 'Intéressée par un suivi mensuel (Pro).',
    },
    {
      user: user._id,
      name: 'Paul Morel',
      email: 'paul.morel@gmail.com',
      phone: '06 98 11 70 23',
      company: 'Freelance',
      kind: 'client',
      price: 620,
      nextAction: '',
      notes: 'Identité pour son activité de formateur.',
    },
    {
      user: user._id,
      name: 'Sara Klein',
      email: 'sara@atelier-klein.fr',
      company: 'Atelier Klein',
      kind: 'client',
      price: 2100,
      nextAction: 'Livrer les visuels',
    },
    {
      user: user._id,
      name: 'Marc Lefèvre',
      email: 'marc@lefevre-conseil.fr',
      company: 'Lefèvre Conseil',
      kind: 'client',
      price: 980,
    },
    {
      user: user._id,
      name: 'Anaïs Cohen',
      email: 'anais.cohen@gmail.com',
      company: 'Studio Cohen',
      kind: 'client',
      price: 1250,
    },
    {
      user: user._id,
      name: 'Olivier Renard',
      email: 'olivier@renard-bois.fr',
      company: 'Renard Bois',
      kind: 'client',
      price: 760,
    },
    {
      user: user._id,
      name: 'Julie Perrot',
      email: 'julie@perrot-photo.fr',
      company: 'Perrot Photo',
      kind: 'client',
      price: 430,
    },
    {
      user: user._id,
      name: 'Yanis Haddad',
      email: 'yanis@haddad-archi.fr',
      company: 'Haddad Archi',
      kind: 'client',
      price: 3200,
    },
    {
      user: user._id,
      name: 'Émilie Faure',
      email: 'emilie@faure-studio.fr',
      company: 'Faure Studio',
      kind: 'client',
      price: 540,
    },
  ])

  await Appointment.create([
    {
      user: user._id,
      contact: clinique._id,
      title: 'Brief photos — Clinique Martin',
      startAt: hoursFromNow(3),
      location: 'Visio',
      status: 'planned',
    },
    {
      user: user._id,
      contact: dupont._id,
      title: 'Point facture Dupont',
      startAt: hoursFromNow(28),
      location: 'Studio Moreau',
      status: 'planned',
    },
    {
      user: user._id,
      contact: atelier._id,
      title: 'Présentation devis Atelier Nord',
      startAt: daysFromNow(3),
      location: 'Leur atelier, Vaise',
      status: 'planned',
    },
  ])

  await Transaction.create([
    {
      user: user._id,
      kind: 'income',
      label: 'Identité Maison Dupont',
      amount: 1860,
      date: daysFromNow(-1),
      category: 'Prestation',
    },
    {
      user: user._id,
      kind: 'income',
      label: 'Portraits Clinique Martin — acompte',
      amount: 720,
      date: hoursFromNow(-20),
      category: 'Prestation',
    },
    {
      user: user._id,
      kind: 'expense',
      label: 'Abonnement Adobe',
      amount: 71.99,
      date: daysFromNow(-3),
      category: 'Outils',
    },
    {
      user: user._id,
      kind: 'expense',
      label: 'Impression cartes',
      amount: 84,
      date: daysFromNow(-2),
      category: 'Fournitures',
    },
  ])

  await Reminder.create([
    {
      user: user._id,
      contact: dupont._id,
      title: 'Relancer la facture Dupont',
      dueAt: hoursFromNow(8),
      channel: 'email',
    },
    {
      user: user._id,
      contact: atelier._id,
      title: 'Envoyer le devis Atelier Nord',
      dueAt: daysFromNow(1),
      channel: 'email',
    },
    {
      user: user._id,
      contact: verde._id,
      title: 'Rappeler Maison Verde',
      dueAt: daysFromNow(2),
      channel: 'phone',
    },
  ])

  await Note.create([
    {
      user: user._id,
      contact: dupont._id,
      title: 'Ton visuel Dupont',
      body: 'Ils veulent plus de crème, moins de noir. Reprendre la papeterie avec le vert sauge.',
    },
    {
      user: user._id,
      title: 'Idée offre suivi',
      body: 'Proposer un forfait mensuel 4h aux clients récurrents, plutôt que du projet par projet.',
    },
    {
      user: user._id,
      contact: atelier._id,
      title: 'Atelier Nord — brief',
      body: 'Site vitrine, 6 pages, photos déjà faites. Livraison souhaitée avant juin.',
    },
  ])

  await InboxItem.create([
    {
      user: user._id,
      source: 'instagram',
      from: '@atelier.nord',
      preview: 'Bonjour Léa, on a vu votre travail pour Dupont. Vous auriez un créneau pour un site ?',
      receivedAt: hoursFromNow(-5),
      read: false,
    },
    {
      user: user._id,
      source: 'email',
      from: 'claire.dupont@gmail.com',
      preview: 'La facture de mars est bien reçue, on règle en début de semaine prochaine.',
      receivedAt: hoursFromNow(-20),
      read: false,
    },
    {
      user: user._id,
      source: 'facebook',
      from: 'Maison Verde',
      preview: 'Est-ce que vous suivez aussi les indépendants sur plusieurs mois ?',
      receivedAt: daysFromNow(-2),
      read: true,
    },
    {
      user: user._id,
      source: 'email',
      from: 'accueil@outlook.fr',
      preview: 'Confirmez-vous le brief de cet après-midi en visio ?',
      receivedAt: hoursFromNow(-1),
      read: false,
    },
  ])

  console.log(`Espace démo prêt pour ${user.email}`)
}

async function seedDemoJournal(user) {
  const existing = await DayLog.countDocuments({ user: user._id })
  if (existing > 0) return

  await DayLog.create([
    {
      user: user._id,
      dateKey: toDateKey(daysFromNow(-1)),
      tasks: [
        { title: 'Envoyer le devis Atelier Nord', done: true },
        { title: 'Relancer la facture Dupont', done: true },
        { title: 'Ranger les visuels du mois', done: false },
      ],
    },
    {
      user: user._id,
      dateKey: toDateKey(),
      tasks: [
        { title: 'Facture Clinique Martin', done: false },
        { title: 'Brief photos 14h', done: false },
        { title: 'Répondre à @atelier.nord', done: true },
      ],
    },
  ])
}

async function ensureDemoMember() {
  const email = String(process.env.DEMO_EMAIL || 'lea@nolio.test')
    .trim()
    .toLowerCase()
  const password = String(process.env.DEMO_PASSWORD || 'NolioDemo2026!')
  const name = String(process.env.DEMO_NAME || 'Léa Moreau').trim()
  const company = String(process.env.DEMO_COMPANY || 'Studio Moreau').trim()

  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash: await User.hashPassword(password),
      role: 'member',
      subscription: {
        plan: 'pro',
        status: 'active',
        company,
        teamSize: '2',
        activatedAt: daysFromNow(-8),
      },
      business: {
        legalName: name,
        tradeName: company,
        legalForm: 'Micro-entreprise',
        siret: '839 120 456 00017',
        vatNumber: 'Non assujetti',
        apeCode: '74.10Z',
        address: '12 rue des Ateliers',
        postalCode: '69004',
        city: 'Lyon',
        country: 'France',
        phone: '06 18 44 21 07',
        website: 'https://studiomoreau.fr',
      },
    })
    console.log(`Compte démo prêt : ${email}`)
  }

  if (!user.business?.siret) {
    user.business = {
      legalName: user.name,
      tradeName: user.subscription?.company || company,
      legalForm: 'Micro-entreprise',
      siret: '839 120 456 00017',
      vatNumber: 'Non assujetti',
      apeCode: '74.10Z',
      address: '12 rue des Ateliers',
      postalCode: '69004',
      city: 'Lyon',
      country: 'France',
      phone: '06 18 44 21 07',
      website: 'https://studiomoreau.fr',
    }
    if (!user.subscription) user.subscription = { status: 'active' }
    user.subscription.company = user.subscription.company || company
    await user.save()
  }

  await seedDemoWorkspace(user)
  await seedDemoJournal(user)
}

async function ensureEssentielMember() {
  const email = String(process.env.DEMO_ESSENTIEL_EMAIL || 'nora@nolio.test')
    .trim()
    .toLowerCase()
  const password = String(process.env.DEMO_ESSENTIEL_PASSWORD || process.env.DEMO_PASSWORD || 'NolioDemo2026!')
  const name = String(process.env.DEMO_ESSENTIEL_NAME || 'Nora Petit').trim()
  const company = String(process.env.DEMO_ESSENTIEL_COMPANY || 'Atelier Petit').trim()

  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash: await User.hashPassword(password),
      role: 'member',
      subscription: {
        plan: 'essentiel',
        status: 'active',
        company,
        teamSize: '1',
        activatedAt: daysFromNow(-5),
      },
      business: {
        legalName: name,
        tradeName: company,
        legalForm: 'Micro-entreprise',
        siret: '847 331 209 00024',
        vatNumber: 'Non assujetti',
        apeCode: '74.10Z',
        address: '8 rue des Tilleuls',
        postalCode: '33000',
        city: 'Bordeaux',
        country: 'France',
        phone: '06 44 18 02 91',
      },
    })
    console.log(`Compte Essentiel prêt : ${email}`)
  } else if (user.subscription?.plan !== 'essentiel' || user.subscription?.status !== 'active') {
    user.subscription = {
      ...(user.subscription?.toObject?.() || user.subscription || {}),
      plan: 'essentiel',
      status: 'active',
      company: user.subscription?.company || company,
      activatedAt: user.subscription?.activatedAt || daysFromNow(-5),
    }
    await user.save()
  }

  await seedDemoWorkspace(user)
  await seedDemoJournal(user)
}

module.exports = { ensureDemoMember, ensureEssentielMember }
