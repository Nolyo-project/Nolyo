import { useState } from 'react'
import { Link } from 'react-router-dom'
import { homeForUser } from '../auth/homeForUser'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import TryPreviewButton from './TryPreviewButton'

const marketingLinks = [
  { to: '/#produit', label: 'Produit' },
  { to: '/#offres', label: 'Offres' },
  { to: '/#confiance', label: 'Paiements' },
  { to: '/rdv', label: 'Rendez-vous' },
  { to: '/inscription', label: 'J’ai un code' },
]

function Header() {
  const [open, setOpen] = useState(false)
  const { user, logout, loading, isPresident } = useAuth()
  const spaceLabel = isPresident ? 'Dashboard président' : user?.preview ? 'Continuer l’essai' : 'Tableau de bord'
  const spaceTo = user ? homeForUser(user) : '/login'
  const leaveLabel = user?.preview ? 'Quitter l’essai' : 'Déconnexion'

  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
          {marketingLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-ink-soft transition hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loading ? null : user ? (
            <>
              <Link to={spaceTo} className="text-sm font-medium text-ink-soft transition hover:text-ink">
                {spaceLabel}
              </Link>
              <button
                type="button"
                onClick={() => logout(user?.preview ? 'home' : undefined)}
                className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper-2"
              >
                {leaveLabel}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-ink-soft transition hover:text-ink"
              >
                Connexion
              </Link>
              <TryPreviewButton variant="header" onStarted={() => setOpen(false)}>
                Essayer 5 min
              </TryPreviewButton>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-ink md:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
          {open ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div id="menu-mobile" className="border-t border-ink/8 bg-paper px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navigation mobile">
            {marketingLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-2 hover:text-ink"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to={spaceTo}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-2"
                  onClick={() => setOpen(false)}
                >
                  {spaceLabel}
                </Link>
                <button
                  type="button"
                  className="mt-2 rounded-xl border border-ink/10 px-3 py-2.5 text-left text-sm font-semibold"
                  onClick={() => {
                    setOpen(false)
                    logout(user?.preview ? 'home' : undefined)
                  }}
                >
                  {leaveLabel}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-2"
                  onClick={() => setOpen(false)}
                >
                  Connexion
                </Link>
                <TryPreviewButton variant="mobile" onStarted={() => setOpen(false)}>
                  Essayer 5 min
                </TryPreviewButton>
                <Link
                  to="/abonnement"
                  className="mt-2 rounded-xl border border-ink/10 px-3 py-2.5 text-center text-sm font-semibold"
                  onClick={() => setOpen(false)}
                >
                  Demander un abonnement
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
