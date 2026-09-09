function InstagramIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" />
    </svg>
  )
}

function formatWindow(startsAt, endsAt) {
  const opts = { dateStyle: 'full', timeStyle: 'short' }
  const start = startsAt ? new Date(startsAt).toLocaleString('fr-FR', opts) : null
  const end = endsAt ? new Date(endsAt).toLocaleString('fr-FR', opts) : null
  if (start && end) return `Du ${start} au ${end}`
  if (start) return `À partir du ${start}`
  if (end) return `Jusqu’au ${end}`
  return ''
}

export default function ComingSoonPage({ status }) {
  const maintenance = status?.mode === 'maintenance'
  const windowLabel = formatWindow(status?.startsAt, status?.endsAt)
  const rawTitle = String(status?.title || '').trim()
  const title =
    !rawTitle || rawTitle === 'Arrive bientôt'
      ? maintenance
        ? 'Maintenance en cours'
        : 'Nolyo arrive bientôt'
      : rawTitle
  const message =
    status?.message ||
    (maintenance
      ? 'Nous effectuons une maintenance. Merci de votre patience.'
      : 'Le site n’est pas encore ouvert au public. Suivez-nous pour le lancement.')

  return (
    <div className="dash-sidebar flex min-h-svh flex-col text-cream">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-copper uppercase">
          {maintenance ? 'Maintenance' : 'Bientôt'}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-cream/75">{message}</p>
        {windowLabel ? <p className="mt-4 text-sm text-cream/55">{windowLabel}</p> : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://www.instagram.com/nolyofr/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-moss transition hover:bg-paper"
          >
            <InstagramIcon className="h-4 w-4" />
            Suivre @nolyofr
          </a>
          <a
            href="mailto:support.nolyo@gmail.com"
            className="inline-flex items-center rounded-full border border-cream/25 px-5 py-2.5 text-sm font-semibold text-cream transition hover:border-cream/45 hover:bg-cream/5"
          >
            Nous écrire
          </a>
        </div>
      </div>
    </div>
  )
}
