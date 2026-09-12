import { Link } from 'react-router-dom'
import { mediaUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { pagePortrait, publicPageStyle } from '../data/pageTheme'
import Logo from '../components/Logo'
import { publicPageChrome } from './PublicPageAside'

export function PublicPageFrame({ slug, page, error, current = 'home', children }) {
  const { user } = useAuth()

  if (error) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-paper px-5 text-center">
        <Logo />
        <p className="mt-8 font-display text-3xl">Cette page n’est pas disponible.</p>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
        <Link to="/" className="mt-6 text-sm underline">
          Retour à Nolyo
        </Link>
      </div>
    )
  }

  if (!page) {
    return <p className="px-5 py-24 text-center text-ink-soft">Chargement…</p>
  }

  const cover = mediaUrl(page.banner || page.works?.[0]?.image || (page.photos || [])[0] || '')
  const portrait = mediaUrl(pagePortrait(page))
  const initial = (page.title || page.name || 'N').slice(0, 1).toUpperCase()
  const isOwner = Boolean(user?.page?.slug) && user.page.slug === String(slug || '').toLowerCase()
  const themeStyle = publicPageStyle(page.theme)
  const chrome = publicPageChrome(page, slug)
  const navClass = (id) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      current === id ? 'page-cta shadow-sm' : 'page-nav-link hover:bg-ink/5 hover:text-[var(--page-ink)]'
    }`

  return (
    <div className="public-page min-h-svh" style={themeStyle}>
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-2 px-4 py-4 sm:gap-3 sm:px-8 lg:px-12">
          <p className="min-w-0 truncate text-[10px] font-semibold tracking-[0.22em] text-cream/80 uppercase sm:text-[11px] sm:tracking-[0.28em]">
            {page.name}
          </p>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isOwner ? (
              <Link
                to="/dashboard/page"
                className="rounded-full bg-cream px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-paper sm:px-4"
              >
                <span className="sm:hidden">Page</span>
                <span className="hidden sm:inline">Modifier la page</span>
              </Link>
            ) : null}
            <Logo size="sm" className="rounded-full bg-cream/55 px-2 py-1 hover:bg-cream/80" />
          </div>
        </div>
      </header>

      <div className="relative z-0 h-44 overflow-hidden bg-moss sm:h-72 lg:h-[28rem]">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_18%_20%,color-mix(in_srgb,var(--color-copper)_38%,transparent),transparent_52%),var(--color-moss)]" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[color:var(--page-bg)] via-transparent to-ink/50" />
      </div>

      <div className="relative mx-auto min-w-0 max-w-[92rem] px-4 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="relative z-10 -mt-14 sm:-mt-20 lg:-mt-24">
            {portrait ? (
              <img
                src={portrait}
                alt=""
                className="h-24 w-24 rounded-full object-cover shadow-[0_24px_60px_-18px_rgba(36,48,38,0.55)] ring-[5px] ring-[color:var(--page-bg)] sm:h-40 sm:w-40 sm:ring-[6px] lg:h-44 lg:w-44"
              />
            ) : (
              <div className="page-cta grid h-24 w-24 place-items-center rounded-full font-display text-3xl shadow-[0_24px_60px_-18px_rgba(36,48,38,0.55)] ring-[5px] ring-[color:var(--page-bg)] sm:h-40 sm:w-40 sm:text-4xl sm:ring-[6px] lg:h-44 lg:w-44">
                {initial}
              </div>
            )}
          </div>
          <nav className="flex flex-wrap items-center gap-1 pb-1" aria-label="Pages">
            <Link to={`/p/${slug}`} className={navClass('home')}>
              Accueil
            </Link>
            <Link to={`/p/${slug}/a-propos`} className={navClass('about')}>
              À propos
            </Link>
          </nav>
        </div>

        {page.away ? (
          <div
            className="mt-4 rounded-2xl bg-[var(--page-accent)] px-4 py-3 text-center text-[var(--page-accent-ink)] sm:mt-5 sm:px-5"
            role="status"
          >
            <p className="text-sm leading-snug font-semibold">Actuellement en congés</p>
            {page.awayLabel ? (
              <p className="mt-1 text-xs leading-snug font-normal wrap-break-word opacity-90">{page.awayLabel}</p>
            ) : null}
            <p className="mt-1 text-xs leading-snug opacity-80">La réservation en ligne reprend bientôt</p>
          </div>
        ) : page.nextAwayLabel ? (
          <div
            className="mt-4 rounded-2xl bg-[color-mix(in_srgb,var(--page-accent)_14%,var(--page-bg))] px-4 py-3 text-center ring-1 ring-ink/8 sm:mt-5 sm:px-5"
            role="status"
          >
            <p className="text-sm leading-snug font-medium text-[var(--page-ink)]">Prochains congés</p>
            <p className="page-muted mt-1 text-xs leading-snug wrap-break-word">{page.nextAwayLabel}</p>
          </div>
        ) : null}

        {children}
      </div>

      <footer
        className={`page-muted mx-auto max-w-[92rem] px-4 pt-10 text-center text-[11px] opacity-70 sm:px-8 lg:px-12 ${
          chrome.bookingPath
            ? 'pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.25rem))] lg:pb-10'
            : 'pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:pb-10'
        }`}
      >
        Présenté avec{' '}
        <Link to="/" className="underline decoration-ink/15 underline-offset-2 hover:text-ink hover:opacity-100">
          Nolyo
        </Link>
      </footer>

      {chrome.bookingPath ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-[color-mix(in_srgb,var(--page-bg)_92%,transparent)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <div className="flex gap-2">
            <Link
              to={chrome.quotePath && !chrome.sessionServices.length ? chrome.quotePath : chrome.bookingPath}
              className="page-cta flex min-w-0 flex-1 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
            >
              {chrome.sessionServices.length ? 'Réserver' : chrome.quotePath ? 'Demander un devis' : 'Réserver'}
            </Link>
            {chrome.quotePath && chrome.sessionServices.length ? (
              <Link
                to={chrome.quotePath}
                className="flex min-w-0 flex-1 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold ring-1 ring-ink/12"
              >
                Devis
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
