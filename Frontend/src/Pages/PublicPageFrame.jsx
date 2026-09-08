import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeForUser } from '../auth/homeForUser'
import { publicPageStyle } from '../data/pageTheme'
import Logo from '../components/Logo'

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

  const cover = page.banner || (page.photos || [])[0] || ''
  const initial = (page.title || page.name || 'N').slice(0, 1).toUpperCase()
  const isOwner = Boolean(user?.page?.slug) && user.page.slug === String(slug || '').toLowerCase()
  const themeStyle = publicPageStyle(page.theme)
  const navClass = (id) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      current === id ? 'page-cta shadow-sm' : 'page-nav-link hover:bg-ink/5 hover:text-[var(--page-ink)]'
    }`

  return (
    <div className="public-page min-h-svh" style={themeStyle}>
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-12">
          <p className="min-w-0 truncate text-[11px] font-semibold tracking-[0.28em] text-cream/80 uppercase">
            {page.name}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            {isOwner ? (
              <Link
                to={homeForUser(user)}
                className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-paper"
              >
                Tableau de bord
              </Link>
            ) : null}
            <Logo size="sm" className="rounded-full bg-cream/55 px-2 py-1 hover:bg-cream/80" />
          </div>
        </div>
      </header>

      <div className="relative z-0 h-56 overflow-hidden bg-moss sm:h-72 lg:h-[28rem]">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_18%_20%,color-mix(in_srgb,var(--color-copper)_38%,transparent),transparent_52%),var(--color-moss)]" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[color:var(--page-bg)] via-transparent to-ink/50" />
      </div>

      <div className="relative mx-auto min-w-0 max-w-[92rem] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative z-10 -mt-16 sm:-mt-20 lg:-mt-24">
            {page.avatar ? (
              <img
                src={page.avatar}
                alt=""
                className="h-32 w-32 rounded-full object-cover shadow-[0_24px_60px_-18px_rgba(36,48,38,0.55)] ring-[6px] ring-[color:var(--page-bg)] sm:h-40 sm:w-40 lg:h-44 lg:w-44"
              />
            ) : (
              <div className="page-cta grid h-32 w-32 place-items-center rounded-full font-display text-4xl shadow-[0_24px_60px_-18px_rgba(36,48,38,0.55)] ring-[6px] ring-[color:var(--page-bg)] sm:h-40 sm:w-40 lg:h-44 lg:w-44">
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

        {children}
      </div>

      <footer className="page-muted mx-auto max-w-[92rem] px-5 py-10 text-center text-[11px] opacity-70 sm:px-8 lg:px-12">
        Présenté avec{' '}
        <Link to="/" className="underline decoration-ink/15 underline-offset-2 hover:text-ink hover:opacity-100">
          Nolyo
        </Link>
      </footer>
    </div>
  )
}
