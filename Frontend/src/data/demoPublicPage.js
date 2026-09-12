import { api } from '../api/client'

function unsplash(id, w, h) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`
}

const PAGES = {
  'maison-brume': {
    title: 'Maison Brume — soins et rituels, à Lyon',
    name: 'Inès Daroux',
    description: 'Soins du visage, massages lents, rituels aux plantes. Une cabine, un rendez-vous à la fois.',
    trade: 'wellness',
    tradeLabel: 'Bien-être',
    banner: unsplash('photo-1600334129128-685c5582fd35', 1600, 640),
    avatar: unsplash('photo-1616394584738-fc6e612e71b9', 900, 1125),
    photos: [
      unsplash('photo-1544161515-4ab6ce6db874', 1200, 900),
      unsplash('photo-1540555700478-4be289fbecef', 900, 1125),
    ],
    works: [
      { image: unsplash('photo-1544161515-4ab6ce6db874', 1200, 900), url: '' },
      { image: unsplash('photo-1540555700478-4be289fbecef', 900, 1125), url: '' },
    ],
    phone: '06 18 44 21 07',
    email: 'hello@maisonbrume.fr',
    website: 'https://maisonbrume.fr',
    city: 'Lyon',
    postalCode: '69001',
    address: '14 rue des Chartreux',
    instagram: 'https://instagram.com/maisonbrume',
    theme: { accent: '#c45c26', background: '#f3eee4', surface: '#ffffff' },
    hours: { workStart: '09:00', workEnd: '18:00', workDays: [1, 2, 3, 4, 5], note: '' },
    bookingAvailable: false,
    reviews: [],
    about: {
      body: 'Massages lents, soins du visage, rituels aux plantes.',
      people: [
        {
          name: 'Inès Daroux',
          role: 'Praticienne',
          bio: 'Huit ans de pratique, toujours une cabine à la fois.',
          photo: unsplash('photo-1616394584738-fc6e612e71b9', 900, 1125),
        },
      ],
    },
    services: [
      { _id: 'demo-w1', name: 'Soin visage', price: 75, durationMinutes: 60, kind: 'session' },
      { _id: 'demo-w2', name: 'Massage', price: 90, durationMinutes: 75, kind: 'session' },
    ],
  },
}

export function demoPublicPage(slug) {
  const base = PAGES[String(slug || '').toLowerCase()]
  return base ? { ...base } : null
}

export async function loadPublicPage(slug) {
  try {
    const data = await api(`/api/public/pages/${slug}`)
    return data.page
  } catch (err) {
    const demo = demoPublicPage(slug)
    if (demo) return demo
    throw err
  }
}
