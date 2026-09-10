import { Link } from 'react-router-dom'
import { isHeadingService, isQuoteService } from '../data/pageTheme'

function Svg({ children, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {children}
    </svg>
  )
}

const ICONS = {
  phone: (
    <Svg>
      <path
        d="M7 3.8h3.2l1.2 3.2-1.6 1.6a12 12 0 006.6 6.6l1.6-1.6 3.2 1.2V20a1 1 0 01-1 1A16 16 0 013 6.8a1 1 0 011-1H7z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  email: (
    <Svg>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  web: (
    <Svg>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 12h16M12 4c2.4 2.4 3.6 5.2 3.6 8s-1.2 5.6-3.6 8c-2.4-2.4-3.6-5.2-3.6-8s1.2-5.6 3.6-8z" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  ),
  address: (
    <Svg>
      <path d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0012 4.3a6.5 6.5 0 00-6.5 6.5C5.5 15.8 12 21 12 21z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="10.8" r="1.8" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  ),
  hours: (
    <Svg>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  ),
  instagram: (
    <Svg>
      <rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" />
    </Svg>
  ),
  facebook: (
    <Svg>
      <path
        d="M14.2 20v-7.2h2.4l.4-2.8h-2.8V8.4c0-.8.2-1.4 1.4-1.4H17V4.6c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.8v1.7H8.6v2.8h2.6V20h3z"
        fill="currentColor"
      />
    </Svg>
  ),
  linkedin: (
    <Svg>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 10.4V16.5M8.2 8v.02M11.4 16.5v-3.6c0-1.4.8-2.2 2-2.2s2 .8 2 2.2v3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  ),
}

const SOCIALS = [
  { kind: 'instagram', label: 'Instagram' },
  { kind: 'facebook', label: 'Facebook' },
  { kind: 'linkedin', label: 'LinkedIn' },
]

const DAY_NAMES = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
}

function formatHoursLabel(hours) {
  if (!hours) return ''
  const days = Array.isArray(hours.workDays) ? hours.workDays : []
  if (!days.length) return ''
  const names = days.map((d) => DAY_NAMES[d] || '').filter(Boolean)
  let dayPart = ''
  if (names.length === 1) dayPart = names[0]
  else if (names.length > 1) dayPart = `${names[0]} – ${names[names.length - 1]}`
  const timePart =
    hours.workStart && hours.workEnd ? `${hours.workStart.replace(':', 'h')} – ${hours.workEnd.replace(':', 'h')}` : ''
  return [dayPart, timePart].filter(Boolean).join(' · ')
}

function mapsUrl(page) {
  if (page?.lat != null && page?.lng != null) {
    return `https://www.google.com/maps?q=${page.lat},${page.lng}`
  }
  const q = [page?.address, page?.postalCode, page?.city].filter(Boolean).join(', ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : ''
}

function addressLabel(page) {
  return [page?.address, [page?.postalCode, page?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

function ContactRow({ item }) {
  const inner = (
    <>
      <span className="page-accent mt-0.5">{ICONS[item.key]}</span>
      <span className="min-w-0">
        <span className="page-muted block text-[10px] font-semibold tracking-[0.18em] uppercase">{item.title}</span>
        <span className="mt-1 block wrap-break-word text-[0.95rem] leading-snug">{item.label}</span>
      </span>
    </>
  )

  if (!item.href) {
    return <div className="flex gap-3.5 py-3.5">{inner}</div>
  }

  return (
    <a
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noreferrer' : undefined}
      className="flex gap-3.5 py-3.5 transition hover:text-[var(--page-accent)]"
    >
      {inner}
    </a>
  )
}

export function publicPageChrome(page, slug) {
  const services = page?.services || []
  const quoteService = services.find((item) => isQuoteService(item))
  const sessionServices = services.filter((item) => !isQuoteService(item) && !isHeadingService(item))
  const bookingAvailable = Boolean(page?.bookingAvailable) && services.some((item) => !isHeadingService(item))
  const bookingPath = bookingAvailable ? `/p/${slug}/reserver` : ''
  const quotePath = quoteService ? `/p/${slug}/reserver?type=devis` : ''
  const bookHref = page?.phone
    ? `tel:${page.phone.replace(/\s/g, '')}`
    : page?.email
      ? `mailto:${page.email}`
      : page?.website || ''
  const contacts = page
    ? [
        page.phone
          ? { key: 'phone', title: 'Téléphone', href: `tel:${page.phone.replace(/\s/g, '')}`, label: page.phone }
          : null,
        page.email ? { key: 'email', title: 'E-mail', href: `mailto:${page.email}`, label: page.email } : null,
        page.website
          ? {
              key: 'web',
              title: 'Site',
              href: page.website,
              label: page.website.replace(/^https?:\/\//, ''),
              external: true,
            }
          : null,
        addressLabel(page)
          ? {
              key: 'address',
              title: 'Adresse',
              href: mapsUrl(page),
              label: addressLabel(page),
              external: Boolean(mapsUrl(page)),
            }
          : null,
        formatHoursLabel(page.hours)
          ? {
              key: 'hours',
              title: 'Horaires',
              href: '',
              label: [formatHoursLabel(page.hours), page.hours?.note].filter(Boolean).join(' — '),
            }
          : null,
      ].filter(Boolean)
    : []
  const socials = SOCIALS.map((item) => ({ ...item, href: page?.[item.kind] })).filter((item) => item.href)
  const hasMap = page?.lat != null && page?.lng != null
  const hasAside = contacts.length > 0 || socials.length > 0 || Boolean(bookHref) || Boolean(bookingPath) || hasMap
  return {
    services,
    quoteService,
    sessionServices,
    bookingPath,
    quotePath,
    bookHref,
    contacts,
    socials,
    hasAside,
    hasMap,
    mapsHref: mapsUrl(page),
  }
}

export function publicPageMainClass(hasAside) {
  return `min-w-0 pt-8 pb-36 lg:pt-14 lg:pb-28 ${
    hasAside ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-20' : ''
  }`
}

export function PublicPageAside({ page, slug, copy }) {
  const { contacts, socials, bookingPath, quotePath, sessionServices, bookHref, hasAside, hasMap, mapsHref } =
    publicPageChrome(page, slug)
  if (!hasAside) return null

  const delta = 0.012
  const mapSrc =
    hasMap
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${page.lng - delta}%2C${page.lat - delta}%2C${
          page.lng + delta
        }%2C${page.lat + delta}&layer=mapnik&marker=${page.lat}%2C${page.lng}`
      : ''

  return (
    <aside className="mt-12 min-w-0 lg:sticky lg:top-8 lg:mt-2">
      <div className="page-card rounded-[1.8rem] px-5 py-6 shadow-[0_28px_70px_-36px_rgba(36,48,38,0.5)] ring-1 ring-ink/8 sm:px-7 sm:py-8">
        <p className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">{copy.contactKicker}</p>
        {contacts.length ? (
          <ul className="mt-2 divide-y divide-ink/8">
            {contacts.map((item) => (
              <li key={item.key}>
                <ContactRow item={item} />
              </li>
            ))}
          </ul>
        ) : null}

        {hasMap ? (
          <div className={`${contacts.length ? 'mt-2 border-t border-ink/8 pt-6' : 'mt-6'}`}>
            <p className="page-muted text-[10px] font-semibold tracking-[0.18em] uppercase">Sur la carte</p>
            <div className="mt-4 overflow-hidden rounded-[1.2rem] ring-1 ring-ink/8">
              <iframe title="Carte" src={mapSrc} className="h-52 w-full border-0" loading="lazy" />
            </div>
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="page-accent mt-3 inline-block text-sm font-medium underline underline-offset-4"
              >
                Ouvrir dans Maps
              </a>
            ) : null}
          </div>
        ) : null}

        {socials.length ? (
          <div className={`${contacts.length || hasMap ? 'mt-2 border-t border-ink/8 pt-6' : 'mt-6'}`}>
            <p className="page-muted text-[10px] font-semibold tracking-[0.18em] uppercase">Réseaux</p>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {socials.map((item) => (
                <li key={item.kind}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="page-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm ring-1 ring-ink/8 transition hover:bg-[var(--page-accent)] hover:text-[var(--page-accent-ink)] hover:ring-[var(--page-accent)]"
                  >
                    {ICONS[item.kind]}
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {bookingPath ? (
          <div className="mt-8 hidden space-y-2 lg:block">
            {sessionServices.length || !quotePath ? (
              <Link
                to={quotePath && !sessionServices.length ? quotePath : bookingPath}
                className="page-cta flex w-full items-center justify-center rounded-full px-5 py-3.5 text-sm font-semibold transition"
              >
                {sessionServices.length ? copy.bookingCta : copy.quoteCta}
              </Link>
            ) : null}
            {quotePath && sessionServices.length ? (
              <Link
                to={quotePath}
                className="flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold ring-1 ring-ink/12 transition hover:ring-[var(--page-accent)]"
              >
                {copy.quoteCta}
              </Link>
            ) : null}
          </div>
        ) : bookHref ? (
          <a
            href={bookHref}
            className="page-cta mt-8 flex w-full items-center justify-center rounded-full px-5 py-3.5 text-sm font-semibold transition"
          >
            {page.phone ? copy.bookingCta : 'Écrire'}
          </a>
        ) : null}
      </div>
    </aside>
  )
}
