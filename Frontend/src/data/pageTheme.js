export const DEFAULT_THEME = {
  accent: '#c45c26',
  background: '#f3eee4',
  surface: '#ffffff',
}

export const ACCENT_PRESETS = ['#c45c26', '#243026', '#8b3a2d', '#1d4e4e', '#3d4a7c', '#6b3d5b']
export const BACKGROUND_PRESETS = ['#faf7f1', '#f3eee4', '#ffffff', '#efe6d6', '#f0ebe3', '#e8f0ec']
export const SURFACE_PRESETS = ['#ffffff', '#faf7f1', '#f3eee4', '#efe6d6']

export function parseHex(value, fallback = DEFAULT_THEME.accent) {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  let hex = (raw.startsWith('#') ? raw : `#${raw}`).toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : fallback
}

export function pickTheme(source = {}) {
  const incoming = source && typeof source === 'object' ? source : {}
  return {
    accent: parseHex(incoming.accent, DEFAULT_THEME.accent),
    background: parseHex(incoming.background, DEFAULT_THEME.background),
    surface: parseHex(incoming.surface, DEFAULT_THEME.surface),
  }
}

function luminance(hex) {
  const n = parseHex(hex, '#000000').slice(1)
  const toLin = (c) => {
    const v = parseInt(c, 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLin(n.slice(0, 2)) + 0.7152 * toLin(n.slice(2, 4)) + 0.0722 * toLin(n.slice(4, 6))
}

export function contrastOn(hex) {
  return luminance(hex) > 0.45 ? '#243026' : '#faf7f1'
}

export function publicPageStyle(theme) {
  const next = pickTheme(theme)
  return {
    '--page-bg': next.background,
    '--page-ink': contrastOn(next.background),
    '--page-surface': next.surface,
    '--page-surface-ink': contrastOn(next.surface),
    '--page-accent': next.accent,
    '--page-accent-ink': contrastOn(next.accent),
  }
}

export function pagePortrait(page) {
  if (page?.avatar) return page.avatar
  const person = (page?.about?.people || []).find((item) => item?.photo)
  return person?.photo || ''
}

export function aboutPeople(page) {
  const people = (page?.about?.people || []).filter(
    (person) => person?.name || person?.photo || person?.role || person?.bio,
  )
  const avatar = page?.avatar || ''
  if (people.length) {
    return people.map((person, index) => ({
      ...person,
      name: person.name || (index === 0 ? page.name || page.title || '' : ''),
      role: person.role || (index === 0 && people.length === 1 ? page.tradeLabel || 'Fondateur' : ''),
      photo: person.photo || (index === 0 ? avatar : ''),
    }))
  }
  if (avatar || page?.name) {
    return [
      {
        name: page.name || page.title || '',
        role: page.tradeLabel || 'Fondateur',
        bio: '',
        photo: avatar,
      },
    ]
  }
  return []
}

export function hasAboutContent(page) {
  if (aboutPeople(page).length) return true
  const about = page?.about || {}
  if (String(about.body || '').trim()) return true
  return Boolean(page?.avatar)
}

export function isQuoteService(item) {
  return item?.kind === 'quote'
}

export function isHeadingService(item) {
  return item?.kind === 'heading'
}

export function groupServicesByHeading(list = []) {
  const services = list || []
  const headings = services.filter(isHeadingService)
  const hasLinked = services.some((item) => !isHeadingService(item) && item.headingId)

  if (!hasLinked) {
    const blocks = []
    let current = { title: '', headingId: null, items: [] }
    for (const item of services) {
      if (isHeadingService(item)) {
        if (current.items.length || current.title) blocks.push(current)
        current = { title: item.name, headingId: item._id, items: [] }
      } else {
        current.items.push(item)
      }
    }
    if (current.items.length || current.title) blocks.push(current)
    return blocks
  }

  const byHeading = new Map()
  const ungrouped = []
  for (const item of services) {
    if (isHeadingService(item)) continue
    const key = item.headingId ? String(item.headingId) : ''
    if (key) {
      if (!byHeading.has(key)) byHeading.set(key, [])
      byHeading.get(key).push(item)
    } else {
      ungrouped.push(item)
    }
  }

  const blocks = headings.map((heading) => ({
    title: heading.name,
    headingId: heading._id,
    items: byHeading.get(String(heading._id)) || [],
  }))
  if (ungrouped.length) blocks.push({ title: '', headingId: null, items: ungrouped })
  return blocks
}

export function bookableServices(list = []) {
  return (list || []).filter((item) => !isHeadingService(item))
}

export function servicePriceLabel(item, formatMoney) {
  if (isHeadingService(item)) return ''
  if (isQuoteService(item) && !(Number(item?.price) > 0)) return 'Sur rendez-vous'
  return formatMoney(item?.price || 0)
}
