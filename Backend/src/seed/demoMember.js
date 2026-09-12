const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const DayLog = require('../models/DayLog')
const InboxItem = require('../models/InboxItem')
const Note = require('../models/Note')
const Reminder = require('../models/Reminder')
const Service = require('../models/Service')
const Transaction = require('../models/Transaction')
const Review = require('../models/Review')
const Absence = require('../models/Absence')
const User = require('../models/User')
const { getTrade } = require('../data/trades')
const { pickWorkspace } = require('../data/workspace')
const { deleteMemberAccount } = require('../utils/deleteAccount')
const { UPLOAD_ROOT } = require('../utils/uploads')

const PASSWORD = process.env.DEMO_PASSWORD || 'NolioDemo2026!'

const RETIRED_EMAILS = [
  'lea@nolio.test',
  'nora@nolio.test',
  'test.pro@nolio.test',
  'test.essentiel@nolio.test',
  'adam@nolio.test',
  'maya@nolio.test',
  'leo@nolio.test',
]
const RETIRED_SLUGS = ['maison-seve', 'atelier-lina', 'khelifi-studio', 'studio-soler', 'salon-marin']

const unsplash = (id, w, h) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`

const PROFILES = [
  {
    email: 'ines@nolio.test',
    plan: 'pro',
    publishPage: true,
    name: 'Inès Daroux',
    company: 'Maison Brume',
    legalName: 'Maison Brume',
    pageEmail: 'hello@maisonbrume.fr',
    slug: 'maison-brume',
    phone: '06 18 44 21 07',
    city: 'Lyon',
    postalCode: '69001',
    address: '14 rue des Chartreux',
    addressExtra: 'Cour intérieure, 1er étage',
    website: 'https://maisonbrume.fr',
    siret: '839 120 456 00017',
    vatNumber: 'FR42839120456',
    rcs: 'RCS Lyon 839 120 456',
    iban: 'FR76 3000 4000 0100 0123 4567 890',
    apeCode: '96.04Z',
    trade: 'wellness',
    workMode: 'appointments',
    displayAs: 'company',
    legalForm: 'EURL',
    title: 'Maison Brume — soins et rituels, à Lyon',
    description:
      'Un salon calme, à l’abri de la rue. Massages lents, soins du visage, rituels aux plantes — pour celles et ceux qui veulent simplement se poser.\n\n' +
      'Je reçois sur rendez-vous, une personne à la fois. Les séances durent une heure ou plus. Les huiles, les linges, la lumière : tout est choisi pour que vous puissiez revenir dans votre peau, sans bruit.\n\n' +
      'Maison Brume est à Croix-Rousse. Premier échange offert, places limitées.',
    instagram: '@maisonbrume',
    facebook: 'maisonbrume.lyon',
    linkedin: 'ines-daroux',
    theme: { accent: '#c45c26', background: '#f3eee4', surface: '#ffffff' },
    about: {
      body:
        'Maison Brume, c’est un salon calme à Croix-Rousse. Une personne à la fois, des huiles choisies, le temps de se poser.\n\n' +
        'Je reçois sur rendez-vous, en semaine et le samedi matin. Les séances durent une heure ou plus. Les linges, la lumière, le silence : tout est pensé pour que vous puissiez simplement revenir dans votre peau.\n\n' +
        'Premier échange offert. Places limitées.',
      people: [
        {
          name: 'Inès Daroux',
          role: 'Fondatrice',
          bio: 'Massages lents, soins du visage, rituels aux plantes. Huit ans de pratique, toujours une cabine à la fois.',
          photo: unsplash('photo-1616394584738-fc6e612e71b9', 900, 1125),
        },
      ],
    },
    images: {
      avatar: unsplash('photo-1616394584738-fc6e612e71b9', 900, 1125),
      banner: unsplash('photo-1600334129128-685c5582fd35', 1600, 640),
      photos: [
        unsplash('photo-1544161515-4ab6ce6db874', 1200, 900),
        unsplash('photo-1540555700478-4be289fbecef', 900, 1125),
        unsplash('photo-1519824145371-296894a0daa9', 900, 1125),
      ],
    },
    services: [
      { name: 'Soin visage', price: 75, durationMinutes: 60 },
      { name: 'Massage', price: 90, durationMinutes: 75 },
      { name: 'Rituel découverte', price: 45, durationMinutes: 45 },
    ],
    getSeed: wellnessSeed,
  },
  {
    email: 'essentiel@nolio.test',
    plan: 'essentiel',
    publishPage: false,
    name: 'Jules Morel',
    company: 'Cabinet Morel',
    legalName: 'Jules Morel',
    pageEmail: 'jules@cabinetmorel.fr',
    slug: '',
    phone: '06 51 22 08 44',
    city: 'Paris',
    postalCode: '75011',
    address: '22 rue de la Folie-Méricourt',
    addressExtra: '3e étage',
    website: '',
    siret: '851 204 778 00021',
    vatNumber: 'FR32851204778',
    rcs: 'RCS Paris 851 204 778',
    iban: 'FR76 3000 4008 0300 0123 4567 892',
    apeCode: '62.01Z',
    trade: 'consulting',
    workMode: 'projects',
    displayAs: 'person',
    legalForm: 'Micro-entreprise',
    title: '',
    description: '',
    instagram: '',
    facebook: '',
    linkedin: 'jules-morel',
    theme: { accent: '#243026', background: '#f3eee4', surface: '#ffffff' },
    about: { body: '', people: [] },
    images: {
      avatar: unsplash('photo-1507003211169-0a1dd7228f2d', 900, 1125),
      banner: unsplash('photo-1517694712202-14dd9538aa97', 1600, 640),
      photos: [
        unsplash('photo-1498050108023-c5249f4df085', 1200, 900),
        unsplash('photo-1486312338219-ce68d2c6f44d', 900, 1125),
        unsplash('photo-1515879218367-8466d910aaa4', 900, 1125),
      ],
    },
    services: [
      { name: 'Demande de devis', price: 0, durationMinutes: 30, kind: 'quote' },
      { name: 'Mission demi-journée', price: 450, durationMinutes: 240 },
      { name: 'Accompagnement mensuel', price: 900, durationMinutes: 60 },
    ],
    getSeed: developerSeed,
  },
]

function wellnessSeed() {
  return {
    contacts: [
      {
        name: 'Claire Dupont',
        firstName: 'Claire',
        lastName: 'Dupont',
        email: 'claire.dupont@gmail.com',
        phone: '06 12 44 18 90',
        kind: 'client',
        price: 90,
        activity: 'Massage',
        nextAction: '',
        notes: 'Nuque sensible. Préfère les huiles douces.',
      },
      {
        name: 'Hugo Fernandes',
        firstName: 'Hugo',
        lastName: 'Fernandes',
        email: 'hugo.fernandes@gmail.com',
        phone: '07 81 22 09 44',
        kind: 'client',
        price: 75,
        activity: 'Soin visage',
        notes: 'Vient le samedi matin.',
      },
      {
        name: 'Inès Verde',
        firstName: 'Inès',
        lastName: 'Verde',
        email: 'ines.verde@gmail.com',
        kind: 'client',
        price: 45,
        activity: 'Rituel découverte',
        notes: 'Première séance la semaine dernière.',
      },
      {
        name: 'Paul Morel',
        firstName: 'Paul',
        lastName: 'Morel',
        email: 'paul.morel@gmail.com',
        phone: '06 98 11 70 23',
        kind: 'client',
        price: 90,
        activity: 'Massage',
      },
      {
        name: 'Amélie Bernard',
        firstName: 'Amélie',
        lastName: 'Bernard',
        email: 'amelie.bernard@gmail.com',
        phone: '06 44 21 08 17',
        kind: 'client',
        price: 75,
        activity: 'Soin visage',
      },
      {
        name: 'Camille Roux',
        firstName: 'Camille',
        lastName: 'Roux',
        email: 'camille.roux@gmail.com',
        phone: '07 12 90 44 31',
        kind: 'client',
        price: 90,
        activity: 'Massage',
      },
      {
        name: 'David Petit',
        firstName: 'David',
        lastName: 'Petit',
        email: 'david.petit@gmail.com',
        kind: 'client',
        price: 45,
        activity: 'Rituel découverte',
      },
      {
        name: 'Emma Lambert',
        firstName: 'Emma',
        lastName: 'Lambert',
        email: 'emma.lambert@gmail.com',
        phone: '06 77 18 02 45',
        kind: 'client',
        price: 90,
        activity: 'Massage',
      },
      {
        name: 'Julien Marchand',
        firstName: 'Julien',
        lastName: 'Marchand',
        email: 'julien.marchand@gmail.com',
        phone: '07 55 09 21 88',
        kind: 'client',
        price: 75,
        activity: 'Soin visage',
      },
      {
        name: 'Léa Noël',
        firstName: 'Léa',
        lastName: 'Noël',
        email: 'lea.noel@gmail.com',
        kind: 'client',
        price: 90,
        activity: 'Massage',
      },
      {
        name: 'Noah Garnier',
        firstName: 'Noah',
        lastName: 'Garnier',
        email: 'noah.garnier@gmail.com',
        phone: '06 31 44 70 12',
        kind: 'client',
        price: 45,
        activity: 'Rituel découverte',
      },
      {
        name: 'Sophie Caron',
        firstName: 'Sophie',
        lastName: 'Caron',
        email: 'sophie.caron@gmail.com',
        phone: '07 98 11 63 04',
        kind: 'client',
        price: 75,
        activity: 'Soin visage',
      },
      {
        name: 'Thomas Leroy',
        firstName: 'Thomas',
        lastName: 'Leroy',
        email: 'thomas.leroy@gmail.com',
        kind: 'client',
        price: 90,
        activity: 'Massage',
      },
    ],
    appointments: [
      { contact: 0, title: 'Massage — Claire Dupont', hours: -2, location: 'Cabine 1', durationMinutes: 75 },
      { contact: 1, title: 'Soin visage — Hugo Fernandes', hours: 1.5, location: 'Cabine 2', durationMinutes: 60 },
      { contact: 4, title: 'Soin visage — Amélie Bernard', hours: 4, location: 'Cabine 1', durationMinutes: 60 },
      { contact: 5, title: 'Massage — Camille Roux', hours: 6.5, location: 'Cabine 1', durationMinutes: 75 },
      { contact: 2, title: 'Rituel découverte — Inès Verde', days: 2, location: 'Cabine 1', durationMinutes: 45 },
    ],
    transactions: [
      { kind: 'income', label: 'Massage Claire Dupont', amount: 90, days: -1, category: 'Séance' },
      { kind: 'income', label: 'Soin visage Hugo Fernandes', amount: 75, hours: -20, category: 'Séance' },
      { kind: 'income', label: 'Massage Léa Noël', amount: 90, days: -4, category: 'Séance' },
      { kind: 'income', label: 'Rituel découverte David Petit', amount: 45, days: -6, category: 'Séance' },
      { kind: 'expense', label: 'Huiles et linges', amount: 48, days: -3, category: 'Fournitures' },
    ],
    reminders: [],
    notes: [
      { contact: 0, title: 'Claire — nuque', body: 'Éviter trop de pression sur la nuque. Huile sésame.' },
      { title: 'Carte d’hiver', body: 'Proposer un rituel plus long en décembre, 90 minutes.' },
      { contact: 1, title: 'Hugo — samedi', body: 'Préfère les créneaux du samedi matin.' },
    ],
    inbox: [
      { source: 'instagram', from: '@claire.d', preview: 'Est-ce qu’il reste une place samedi pour un massage ?', hours: -5 },
      { source: 'email', from: 'hugo.fernandes@gmail.com', preview: 'Je confirme le soin visage de cet après-midi.', hours: -2 },
      { source: 'email', from: 'amelie.bernard@gmail.com', preview: 'Puis-je décaler mon soin de 30 minutes ?', hours: -12 },
    ],
    journal: [
      { days: -1, tasks: [{ title: 'Préparer la cabine', done: true }, { title: 'Commander les huiles', done: false }] },
      {
        days: 0,
        tasks: [
          { title: 'Massage Claire 14h', done: true },
          { title: 'Soin Hugo cet après-midi', done: false },
          { title: 'Répondre à Instagram', done: true },
        ],
      },
    ],
    reviews: [
      {
        authorName: 'Claire Dupont',
        rating: 5,
        body: 'Un vrai cocon. Le massage a détendu toute ma semaine. Je reviens.',
      },
      {
        authorName: 'Hugo Fernandes',
        rating: 5,
        body: 'Soin visage précis, accueil calme. On se sent pris en charge sans bruit.',
      },
      {
        authorName: 'Amélie Bernard',
        rating: 4,
        body: 'Très belle expérience. Cabine soignée, horaires respectés.',
      },
      {
        authorName: 'Léa Moreau',
        rating: 5,
        body: 'Je sors vraiment reposée. La cabine, les huiles, le rythme : tout est juste.',
      },
      {
        authorName: 'Nicolas Petit',
        rating: 5,
        body: 'Accueil simple et chaleureux. On se sent attendu, pas enchaîné.',
      },
      {
        authorName: 'Sarah Klein',
        rating: 4,
        body: 'Très bon soin du visage. Je recommande pour un premier rendez-vous.',
      },
    ],
  }
}

function developerSeed() {
  return {
    contacts: [
      {
        name: 'Claire Dupont',
        firstName: 'Claire',
        lastName: 'Dupont',
        email: 'claire.dupont@maison-dupont.fr',
        phone: '06 12 44 18 90',
        company: 'Maison Dupont',
        kind: 'client',
        price: 1860,
        activity: 'Site vitrine',
        quoteStatus: 'signed',
        nextAction: 'Livrer la page contact',
        notes: 'Identité déjà faite. Ils veulent un site simple, 5 pages.',
      },
      {
        name: 'Hugo Fernandes',
        firstName: 'Hugo',
        lastName: 'Fernandes',
        email: 'hugo@atelier-nord.com',
        phone: '07 81 22 09 44',
        company: 'Atelier Nord',
        kind: 'prospect',
        price: 2400,
        activity: 'Outil de devis',
        quoteStatus: 'sent',
        nextAction: 'Relancer le devis',
        notes: 'Contact via LinkedIn. Budget autour de 2 400 €.',
      },
      {
        name: 'Marc Lefèvre',
        firstName: 'Marc',
        lastName: 'Lefèvre',
        email: 'marc@lefevre-conseil.fr',
        company: 'Lefèvre Conseil',
        kind: 'prospect',
        price: 0,
        activity: 'Demande de devis',
        quoteStatus: 'none',
        notes: 'A pris un créneau pour cadrer.',
      },
      {
        name: 'Sara Klein',
        firstName: 'Sara',
        lastName: 'Klein',
        email: 'sara@atelier-klein.fr',
        company: 'Atelier Klein',
        kind: 'client',
        price: 900,
        activity: 'Accompagnement mensuel',
        quoteStatus: 'signed',
      },
    ],
    appointments: [
      { contact: 2, title: 'Demande de devis — Marc Lefèvre', hours: -1, location: 'Visio', kind: 'quote' },
      { contact: 0, title: 'Point site Dupont', hours: 28, location: 'Visio' },
      { contact: 1, title: 'Présentation devis Atelier Nord', days: 3, location: 'Leur atelier' },
    ],
    transactions: [
      { kind: 'income', label: 'Site Maison Dupont — acompte', amount: 744, days: -1, category: 'Prestation' },
      { kind: 'income', label: 'Accompagnement Atelier Klein', amount: 900, days: -8, category: 'Prestation' },
      { kind: 'expense', label: 'Hébergement', amount: 29, days: -3, category: 'Outils' },
    ],
    reminders: [
      { contact: 1, title: 'Relancer le devis Atelier Nord', days: 1, channel: 'email' },
      { contact: 0, title: 'Livrer la page contact Dupont', days: 2, channel: 'email' },
    ],
    notes: [
      { contact: 0, title: 'Dupont — pages', body: 'Accueil, à propos, prestations, contact, mentions. Pas de blog.' },
      { contact: 1, title: 'Atelier Nord — brief', body: 'Outil interne pour envoyer des devis. 6 utilisateurs.' },
    ],
    inbox: [
      { source: 'email', from: 'hugo@atelier-nord.com', preview: 'On a bien reçu le devis. On revient vers vous lundi.', hours: -6 },
      { source: 'instagram', from: '@lefevre.conseil', preview: 'Vous auriez un créneau pour parler d’un site ?', hours: -20 },
    ],
    journal: [
      { days: -1, tasks: [{ title: 'Envoyer le devis Atelier Nord', done: true }, { title: 'Facture Klein', done: true }] },
      { days: 0, tasks: [{ title: 'Page contact Dupont', done: false }, { title: 'RDV Lefèvre', done: false }] },
    ],
  }
}

function photographerSeed() {
  return {
    contacts: [
      {
        name: 'Dr. Martin',
        firstName: 'Claire',
        lastName: 'Martin',
        email: 'accueil@clinique-martin.fr',
        company: 'Clinique Martin',
        kind: 'client',
        price: 1440,
        activity: 'Portraits équipe',
        quoteStatus: 'signed',
        nextAction: 'Livrer la galerie',
        notes: 'Série portraits + accueil. 8 personnes.',
      },
      {
        name: 'Émilie Faure',
        firstName: 'Émilie',
        lastName: 'Faure',
        email: 'emilie@faure-studio.fr',
        company: 'Faure Studio',
        kind: 'prospect',
        price: 650,
        activity: 'Reportage atelier',
        quoteStatus: 'sent',
        nextAction: 'Relancer le devis',
      },
      {
        name: 'Yanis Haddad',
        firstName: 'Yanis',
        lastName: 'Haddad',
        email: 'yanis@haddad-archi.fr',
        company: 'Haddad Archi',
        kind: 'client',
        price: 280,
        activity: 'Séance portrait',
        quoteStatus: 'signed',
      },
      {
        name: 'Julie Perrot',
        firstName: 'Julie',
        lastName: 'Perrot',
        email: 'julie.perrot@gmail.com',
        kind: 'prospect',
        price: 0,
        activity: 'Demande de devis',
        quoteStatus: 'none',
        notes: 'Mariage septembre. Premier échange posé.',
      },
    ],
    appointments: [
      { contact: 3, title: 'Demande de devis — Julie Perrot', hours: -3, location: 'Studio', kind: 'quote' },
      { contact: 2, title: 'Séance portrait — Yanis Haddad', hours: 8, location: 'Studio' },
      { contact: 0, title: 'Livraison galerie — Clinique Martin', days: 2, location: 'Visio' },
    ],
    transactions: [
      { kind: 'income', label: 'Portraits Clinique Martin — acompte', amount: 720, days: -2, category: 'Prestation' },
      { kind: 'income', label: 'Séance portrait Yanis Haddad', amount: 280, days: -10, category: 'Prestation' },
      { kind: 'expense', label: 'Location studio', amount: 120, days: -4, category: 'Matériel' },
    ],
    reminders: [
      { contact: 1, title: 'Relancer le devis Faure Studio', days: 1, channel: 'email' },
    ],
    notes: [
      { contact: 0, title: 'Clinique Martin', body: 'Lumière douce, fond gris. Ils veulent aussi 3 photos de l’accueil.' },
      { title: 'Offre mariage', body: 'Forfait reportage + 40 tirages, à caler pour 2027.' },
    ],
    inbox: [
      { source: 'instagram', from: '@julie.perrot', preview: 'On cherche une photographe pour un mariage en septembre.', hours: -8 },
      { source: 'email', from: 'accueil@clinique-martin.fr', preview: 'Les portraits sont superbes. Vous livrez quand la galerie ?', hours: -4 },
    ],
    journal: [
      { days: -1, tasks: [{ title: 'Trier la série Martin', done: true }, { title: 'Devis Faure', done: true }] },
      { days: 0, tasks: [{ title: 'Galerie Martin', done: false }, { title: 'Studio 16h Yanis', done: false }] },
    ],
  }
}

function hairdresserSeed() {
  return {
    contacts: [
      {
        name: 'Anaïs Cohen',
        firstName: 'Anaïs',
        lastName: 'Cohen',
        email: 'anais.cohen@gmail.com',
        phone: '06 22 18 44 09',
        kind: 'client',
        price: 85,
        activity: 'Couleur',
        notes: 'Balayage. Revenir toutes les 8 semaines.',
      },
      {
        name: 'Olivier Renard',
        firstName: 'Olivier',
        lastName: 'Renard',
        email: 'olivier.renard@gmail.com',
        phone: '07 12 90 33 18',
        kind: 'client',
        price: 42,
        activity: 'Coupe',
      },
      {
        name: 'Sara Klein',
        firstName: 'Sara',
        lastName: 'Klein',
        email: 'sara.klein@gmail.com',
        kind: 'client',
        price: 42,
        activity: 'Coupe',
        notes: 'Frange. Ne pas trop raccourcir.',
      },
      {
        name: 'Paul Morel',
        firstName: 'Paul',
        lastName: 'Morel',
        email: 'paul.morel@gmail.com',
        kind: 'client',
        price: 22,
        activity: 'Barbe',
      },
    ],
    appointments: [
      { contact: 0, title: 'Couleur — Anaïs Cohen', hours: -1, location: 'Fauteuil 1', durationMinutes: 90 },
      { contact: 1, title: 'Coupe — Olivier Renard', hours: 4, location: 'Fauteuil 2', durationMinutes: 45 },
      { contact: 2, title: 'Coupe — Sara Klein', days: 1, location: 'Fauteuil 1', durationMinutes: 45 },
    ],
    transactions: [
      { kind: 'income', label: 'Couleur Anaïs Cohen', amount: 85, days: -1, category: 'Prestation' },
      { kind: 'income', label: 'Coupe Olivier Renard', amount: 42, hours: -30, category: 'Prestation' },
      { kind: 'expense', label: 'Coloration et shampoings', amount: 64, days: -4, category: 'Fournitures' },
    ],
    reminders: [],
    notes: [
      { contact: 0, title: 'Anaïs — formule', body: '6.1 + 8.1. Poser 25 minutes. Photo du résultat dans la fiche.' },
      { title: 'Samedi', body: 'Ouvrir à 9h les samedis de décembre.' },
    ],
    inbox: [
      { source: 'instagram', from: '@anais.cohen', preview: 'Tu aurais un créneau pour un balayage la semaine prochaine ?', hours: -3 },
      { source: 'facebook', from: 'Sara Klein', preview: 'Je peux décaler ma coupe à jeudi ?', hours: -10, read: true },
    ],
    journal: [
      { days: -1, tasks: [{ title: 'Commander la 6.1', done: true }, { title: 'Répondre à Anaïs', done: true }] },
      { days: 0, tasks: [{ title: 'Couleur Anaïs 11h', done: false }, { title: 'Coupe Olivier 16h', done: false }] },
    ],
  }
}

function downloadFile(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error('Trop de redirections.'))
      return
    }
    const client = url.startsWith('https:') ? https : http
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NolyoDemo/1.0)',
          Accept: 'image/jpeg,image/*,*/*',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          const next = new URL(res.headers.location, url).href
          downloadFile(next, dest, redirects + 1).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        const file = fs.createWriteStream(dest)
        res.pipe(file)
        file.on('finish', () => file.close(resolve))
        file.on('error', reject)
      },
    )
    req.on('error', reject)
  })
}

async function ensureLocalImage(url, dest, force = false) {
  try {
    if (force && fs.existsSync(dest)) fs.unlinkSync(dest)
    if (fs.existsSync(dest) && fs.statSync(dest).size > 2000) return true
    await downloadFile(url, dest)
    return fs.existsSync(dest) && fs.statSync(dest).size > 2000
  } catch (err) {
    console.warn(`Image démo non téléchargée (${path.basename(dest)}) : ${err.message}`)
    return false
  }
}

async function fillDemoImages(user, urls, force = false) {
  const id = String(user._id)
  const avatarAbs = path.join(UPLOAD_ROOT, 'avatars', `${id}.jpg`)
  const bannerAbs = path.join(UPLOAD_ROOT, 'pages', `${id}-banner.jpg`)
  const photoAbs = [0, 1, 2].map((index) => path.join(UPLOAD_ROOT, 'pages', `${id}-${index}.jpg`))
  const avatarOk = await ensureLocalImage(urls.avatar, avatarAbs, force)
  const bannerOk = await ensureLocalImage(urls.banner, bannerAbs, force)
  const photoOk = await Promise.all(urls.photos.map((url, index) => ensureLocalImage(url, photoAbs[index], force)))
  return {
    avatar: avatarOk ? `/uploads/avatars/${id}.jpg` : '',
    banner: bannerOk ? `/uploads/pages/${id}-banner.jpg` : '',
    photos: photoOk.map((ok, index) => (ok ? `/uploads/pages/${id}-${index}.jpg` : '')),
  }
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

function toDateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const day = new Date(date)
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
}

function whenFrom(item) {
  if (item.hours !== undefined) return hoursFromNow(item.hours)
  if (item.days !== undefined) return daysFromNow(item.days)
  return hoursFromNow(2)
}

async function fillCompleteDemoAccount(user, profile) {
  const images = await fillDemoImages(user, profile.images, true)
  const trade = getTrade(profile.trade)
  const plan = profile.plan === 'essentiel' ? 'essentiel' : 'pro'
  const publishPage = plan === 'pro' && profile.publishPage !== false && Boolean(profile.slug)

  user.name = profile.name
  user.avatar = images.avatar
  user.quoteFollowUpDays = 3
  user.quoteFollowUpChannel = profile.workMode === 'appointments' ? 'phone' : 'email'
  user.depositPlan = (trade.depositPlan || []).map((step) => ({ ...step }))
  user.schedule = {
    workStart: trade.schedule.workStart,
    workEnd: trade.schedule.workEnd,
    durationMinutes: trade.schedule.durationMinutes,
    workDays: [...trade.schedule.workDays],
  }
  if (!user.subscription) user.subscription = { status: 'active' }
  user.subscription.plan = plan
  user.subscription.status = 'active'
  user.subscription.company = profile.company
  user.business = {
    legalName: profile.legalName,
    tradeName: profile.company,
    legalForm: profile.legalForm,
    siret: profile.siret,
    vatNumber: profile.vatNumber,
    apeCode: profile.apeCode,
    rcs: profile.rcs,
    capital: '1 000 €',
    address: profile.address,
    addressExtra: profile.addressExtra,
    postalCode: profile.postalCode,
    city: profile.city,
    country: 'France',
    phone: profile.phone,
    website: profile.website,
    iban: profile.iban,
    bic: 'BNPAFRPPXXX',
  }
  if (publishPage) {
    user.page = User.pickPage({
      slug: profile.slug,
      published: true,
      title: profile.title,
      description: profile.description,
      banner: images.banner,
      photos: images.photos,
      instagram: profile.instagram,
      facebook: profile.facebook,
      linkedin: profile.linkedin,
      website: profile.website,
      address: `${profile.address}, ${profile.postalCode} ${profile.city}`,
      phone: profile.phone,
      email: profile.pageEmail,
      theme: profile.theme,
      about: profile.about,
    })
  } else {
    user.page = User.pickPage({
      slug: '',
      published: false,
      title: '',
      description: '',
      banner: '',
      photos: [],
      about: { body: '', people: [] },
    })
  }
  user.onboarding = {
    completedAt: new Date(),
    trade: profile.trade,
    tradeLabel: trade.label,
    workMode: profile.workMode,
    city: profile.city,
    company: profile.company,
  }
  user.workspace = pickWorkspace(
    { displayAs: profile.displayAs },
    { plan, tradeId: profile.trade, workMode: profile.workMode },
  )
  await user.save()
}

async function ensureDemoServices(user, profile) {
  const existing = await Service.countDocuments({ user: user._id })
  if (existing > 0) return
  await Service.create(
    profile.services.map((item, index) => ({
      user: user._id,
      sort: index,
      name: item.name,
      price: item.price,
      durationMinutes: item.durationMinutes,
      kind: item.kind === 'quote' ? 'quote' : 'session',
    })),
  )
}

async function profileSeed(profile) {
  if (typeof profile.getSeed === 'function') return profile.getSeed()
  return profile.seed || { contacts: [] }
}

async function clearDemoWorkspace(userId) {
  await Promise.all([
    Appointment.deleteMany({ user: userId }),
    Contact.deleteMany({ user: userId }),
    DayLog.deleteMany({ user: userId }),
    InboxItem.deleteMany({ user: userId }),
    Note.deleteMany({ user: userId }),
    Reminder.deleteMany({ user: userId }),
    Service.deleteMany({ user: userId }),
    Transaction.deleteMany({ user: userId }),
    Review.deleteMany({ user: userId }),
    Absence.deleteMany({ user: userId }),
  ])
}

async function seedDemoReviews(user, profile) {
  const seed = await profileSeed(profile)
  const reviews = seed.reviews || []
  if (!reviews.length) return
  const existing = await Review.countDocuments({ user: user._id })
  if (existing > 0) return
  await Review.create(
    reviews.map((item) => ({
      user: user._id,
      authorName: item.authorName,
      authorEmail: item.authorEmail || '',
      rating: item.rating,
      body: item.body,
      status: 'approved',
    })),
  )
}

async function seedDemoAbsences(user, profile) {
  if (profile.plan !== 'pro') return
  const existing = await Absence.countDocuments({ user: user._id })
  if (existing > 0) return
  const start = daysFromNow(12)
  const end = daysFromNow(14)
  await Absence.create({
    user: user._id,
    title: 'Congés',
    kind: 'vacation',
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    note: 'Salon fermé — réservation en ligne fermée ces jours-là.',
  })
}

async function topUpMissingContacts(user, wanted) {
  if (!wanted?.length) return
  const rows = await Contact.find({ user: user._id }).select('email')
  const have = new Set(rows.map((item) => String(item.email || '').toLowerCase()).filter(Boolean))
  const missing = wanted.filter((item) => item.email && !have.has(String(item.email).toLowerCase()))
  if (!missing.length) return
  await Contact.create(missing.map((item) => ({ user: user._id, ...item })))
  console.log(`${missing.length} fiche${missing.length > 1 ? 's' : ''} ajoutée${missing.length > 1 ? 's' : ''} pour ${user.email}`)
}

async function seedDemoWorkspace(user, profile, { force = false } = {}) {
  if (force) await clearDemoWorkspace(user._id)

  const existing = await Contact.countDocuments({ user: user._id })
  const seed = await profileSeed(profile)
  if (existing > 0) {
    await topUpMissingContacts(user, seed.contacts)
    await seedDemoReviews(user, profile)
    await seedDemoAbsences(user, profile)
    return
  }
  if (!seed.contacts?.length) {
    console.warn(`Seed démo vide pour ${user.email}`)
    return
  }

  const contacts = await Contact.create(
    seed.contacts.map((item) => ({
      user: user._id,
      ...item,
    })),
  )

  if (seed.appointments?.length) {
    await Appointment.create(
      seed.appointments.map((item) => ({
        user: user._id,
        contact: contacts[item.contact]._id,
        title: item.title,
        startAt: whenFrom(item),
        location: item.location || '',
        status: 'planned',
        kind: item.kind === 'quote' ? 'quote' : 'session',
        durationMinutes: item.durationMinutes || 60,
      })),
    )
  }

  if (seed.transactions?.length) {
    await Transaction.create(
      seed.transactions.map((item) => ({
        user: user._id,
        kind: item.kind,
        label: item.label,
        amount: item.amount,
        date: whenFrom(item),
        category: item.category,
      })),
    )
  }

  if (seed.reminders?.length) {
    await Reminder.create(
      seed.reminders.map((item) => ({
        user: user._id,
        contact: contacts[item.contact]._id,
        title: item.title,
        dueAt: whenFrom(item),
        channel: item.channel || 'email',
      })),
    )
  }

  if (seed.notes?.length) {
    await Note.create(
      seed.notes.map((item) => ({
        user: user._id,
        contact: item.contact !== undefined ? contacts[item.contact]._id : undefined,
        title: item.title,
        body: item.body,
      })),
    )
  }

  if (seed.inbox?.length) {
    await InboxItem.create(
      seed.inbox.map((item) => ({
        user: user._id,
        source: item.source,
        from: item.from,
        preview: item.preview,
        receivedAt: whenFrom(item),
        read: Boolean(item.read),
      })),
    )
  }

  await seedDemoReviews(user, profile)
  await seedDemoAbsences(user, profile)
  console.log(`Espace démo prêt pour ${user.email}`)
}

async function seedDemoJournal(user, profile, { force = false } = {}) {
  if (force) await DayLog.deleteMany({ user: user._id })
  const existing = await DayLog.countDocuments({ user: user._id })
  if (existing > 0) return
  const seed = await profileSeed(profile)
  const rows = seed.journal || []
  if (!rows.length) return
  await DayLog.create(
    rows.map((item) => ({
      user: user._id,
      dateKey: toDateKey(whenFrom(item)),
      tasks: item.tasks,
    })),
  )
}

const BILLING_TEST_EMAIL = 'florentin.essai@nolio.test'
const BILLING_TEST_PASSWORD = process.env.BILLING_TEST_PASSWORD || 'NolioEssai2026!'

async function provisionBillingTestInvoice(user) {
  const { stripeEnabled, getStripe, latestOpenInvoice } = require('../utils/stripe')
  const { getPlan } = require('../config/plans')
  if (!stripeEnabled()) return user

  const stripe = getStripe()
  const plan = getPlan(user.subscription?.plan || 'essentiel')
  if (!stripe || !plan) return user

  let customerId = user.subscription.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { noly_user: String(user._id), noly_billing_test: '1' },
    })
    customerId = customer.id
    user.subscription.stripeCustomerId = customerId
  }

  let open = await latestOpenInvoice(user)
  if (!open || !(open.amount_due > 0)) {
    const draft = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 3,
      metadata: { noly_user: String(user._id), noly_billing_test: '1' },
      auto_advance: false,
    })
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: draft.id,
      currency: 'eur',
      amount: Math.round(plan.price * 100),
      description: `${plan.name} — mois en cours`,
    })
    open = await stripe.invoices.finalizeInvoice(draft.id)
  }

  user.subscription.collectionMethod = 'send_invoice'
  user.subscription.billingChoice = 'invoice'
  user.subscription.status = 'past_due'
  await user.save()
  return user
}

async function ensureBillingTestAccount({ force = false } = {}) {
  const trialEndsAt = daysFromNow(0)
  const activatedAt = daysFromNow(-30)
  let user = await User.findOne({ email: BILLING_TEST_EMAIL })
  const passwordHash = await User.hashPassword(BILLING_TEST_PASSWORD)

  const dayJSubscription = {
    plan: 'essentiel',
    status: 'past_due',
    company: 'Test fin d’essai',
    teamSize: '1',
    activatedAt,
    trialEndsAt,
    nextInvoiceAt: trialEndsAt,
    hasPaymentMethod: false,
    billingChoice: 'invoice',
    billingChoiceAt: new Date(),
    billingPromptSeenAt: new Date(),
    commitmentChoice: '',
    collectionMethod: 'send_invoice',
  }

  if (!user) {
    user = await User.create({
      name: 'Florentin Essai',
      email: BILLING_TEST_EMAIL,
      passwordHash,
      role: 'member',
      onboarding: {
        completedAt: new Date(),
        trade: 'other',
        workMode: 'mix',
        company: 'Test fin d’essai',
      },
      subscription: dayJSubscription,
    })
    try {
      user = await provisionBillingTestInvoice(user)
    } catch (err) {
      console.error('Billing test Stripe', err.message)
    }
    console.log(
      `Compte test jour J prêt : ${BILLING_TEST_EMAIL} / ${BILLING_TEST_PASSWORD} (paiement manuel, past_due)`,
    )
    return user
  }

  user.passwordHash = passwordHash
  const sub = user.subscription || {}
  const keepAsIs = sub.status === 'active' && Boolean(sub.hasPaymentMethod || sub.paidAt)
  if (force || !keepAsIs) {
    user.name = 'Florentin Essai'
    user.onboarding = {
      ...(user.onboarding?.toObject?.() || user.onboarding || {}),
      completedAt: user.onboarding?.completedAt || new Date(),
      trade: user.onboarding?.trade || 'other',
      workMode: user.onboarding?.workMode || 'mix',
      company: 'Test fin d’essai',
    }
    user.subscription = {
      ...(sub.toObject?.() || sub),
      ...dayJSubscription,
      stripeCustomerId: sub.stripeCustomerId || '',
      stripeSubscriptionId: '',
      stripePriceId: '',
    }
    await user.save()
    try {
      user = await provisionBillingTestInvoice(user)
    } catch (err) {
      console.error('Billing test Stripe', err.message)
    }
    console.log(`Compte test jour J réinitialisé : ${BILLING_TEST_EMAIL} (paiement manuel)`)
  } else {
    await user.save()
  }
  return user
}

async function purgeOtherMembers() {
  const keep = new Set([
    ...PROFILES.map((item) => String(item.email).toLowerCase()),
    BILLING_TEST_EMAIL.toLowerCase(),
  ])
  const members = await User.find({ role: 'member' })
  for (const user of members) {
    const email = String(user.email || '').toLowerCase()
    if (keep.has(email)) continue
    await deleteMemberAccount(user)
    console.log(`Compte membre retiré : ${email}`)
  }

  const retired = await User.find({
    role: 'member',
    $or: [{ email: { $in: RETIRED_EMAILS } }, { 'page.slug': { $in: RETIRED_SLUGS } }],
  })
  for (const user of retired) {
    if (keep.has(String(user.email || '').toLowerCase())) continue
    const email = user.email
    await deleteMemberAccount(user)
    console.log(`Compte fictif retiré : ${email}`)
  }
}

async function ensureDemoAccount(profile, { force = false } = {}) {
  const plan = profile.plan === 'essentiel' ? 'essentiel' : 'pro'
  let user = await User.findOne({ email: profile.email })
  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      passwordHash: await User.hashPassword(PASSWORD),
      role: 'member',
      subscription: {
        plan,
        status: 'active',
        company: profile.company,
        teamSize: '1',
        activatedAt: daysFromNow(-10),
      },
    })
    console.log(`Compte démo prêt : ${profile.email} (${plan})`)
  } else if (!(await user.checkPassword(PASSWORD))) {
    user.passwordHash = await User.hashPassword(PASSWORD)
    await user.save()
    console.log(`Mot de passe démo réaligné : ${profile.email}`)
  }

  const photos = user.page?.photos || []
  const imagesIncomplete =
    !user.avatar ||
    (plan === 'pro' && (!user.page?.banner || photos.filter(Boolean).length < 2))
  const planMismatch = user.subscription?.plan !== plan
  const slugMismatch = plan === 'pro' && user.page?.slug !== profile.slug
  const pageNotPublished = plan === 'pro' && !user.page?.published
  const hasAbout =
    Boolean(String(user.page?.about?.body || '').trim()) ||
    (user.page?.about?.people || []).some((person) => person.name || person.photo)

  if (
    force ||
    planMismatch ||
    slugMismatch ||
    pageNotPublished ||
    imagesIncomplete ||
    !user.onboarding?.completedAt
  ) {
    await fillCompleteDemoAccount(user, profile)
  } else if (plan === 'pro' && !hasAbout && profile.about) {
    const current = User.pickPage(user.page?.toObject?.() || user.page || {})
    user.page = User.pickPage({ ...current, about: profile.about })
    await user.save()
  }

  const [contactCount, serviceCount] = await Promise.all([
    Contact.countDocuments({ user: user._id }),
    Service.countDocuments({ user: user._id }),
  ])
  const needsWorkspace = force || contactCount === 0 || serviceCount === 0

  if (needsWorkspace) {
    await clearDemoWorkspace(user._id)
    await ensureDemoServices(user, profile)
    await seedDemoWorkspace(user, profile, { force: false })
    await seedDemoJournal(user, profile, { force: true })
  } else {
    await ensureDemoServices(user, profile)
    await seedDemoWorkspace(user, profile)
    await seedDemoJournal(user, profile)
  }

  return User.findById(user._id)
}

/** Crée/aligne les 2 comptes visiteurs et supprime tout autre membre (le président est conservé). */
async function ensureDemoAccounts({ force = false } = {}) {
  await purgeOtherMembers()
  for (const profile of PROFILES) {
    await ensureDemoAccount(profile, { force })
  }
  await ensureBillingTestAccount()
}

/** Compte utilisé pour l’essai 5 minutes / les aperçus landing (Pro par défaut). */
async function ensurePreviewAccount(plan = 'pro') {
  const wanted = plan === 'essentiel' ? 'essentiel' : 'pro'
  const profile =
    PROFILES.find((item) => item.plan === wanted) ||
    PROFILES.find((item) => item.plan === 'pro') ||
    PROFILES[0]
  const user = await ensureDemoAccount(profile)
  // Si l’espace a été vidé, le recreate tout de suite
  const contacts = await Contact.countDocuments({ user: user._id })
  if (contacts === 0) return ensureDemoAccount(profile, { force: true })
  return user
}

module.exports = {
  ensureDemoAccounts,
  ensurePreviewAccount,
  ensureBillingTestAccount,
  DEMO_EMAILS: [...PROFILES.map((item) => item.email), ...RETIRED_EMAILS, BILLING_TEST_EMAIL],
  DEMO_PASSWORD: PASSWORD,
  BILLING_TEST_EMAIL,
  BILLING_TEST_PASSWORD,
  DEMO_PRO_EMAIL: PROFILES.find((item) => item.plan === 'pro')?.email || 'ines@nolio.test',
  DEMO_ESSENTIEL_EMAIL:
    PROFILES.find((item) => item.plan === 'essentiel')?.email || 'essentiel@nolio.test',
  DEMO_PRO_SLUG: 'maison-brume',
}
