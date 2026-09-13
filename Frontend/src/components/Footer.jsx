import { Link } from 'react-router-dom'
import Logo from './Logo'
import { openConsentPreferences } from '../utils/consent'

const columns = [
  {
    title: 'Nolyo',
    links: [
      { to: '/#accueil', label: 'Accueil' },
      { to: '/#constat', label: 'Fonctionnalités' },
      { to: '/#offres', label: 'Tarifs' },
      { to: '/#pro', label: 'Nolyo Pro' },
      { to: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { to: '/mentions-legales', label: 'Mentions légales' },
      { to: '/cgv', label: 'CGV' },
      { to: '/politique-confidentialite', label: 'Politique de confidentialité' },
    ],
  },
  {
    title: 'Contact',
    links: [{ to: 'mailto:support.nolyo@gmail.com', label: 'support.nolyo@gmail.com', external: true }],
  },
]

function InstagramIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-moss text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12">
        <div>
          <Logo to="/" inverted />
          <p className="mt-4 font-display text-xl tracking-tight text-cream/90">Gérez. Développez. Rayonnez.</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/60">
            L’outil pensé pour les indépendants. Premier mois offert.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <a
              href="https://www.instagram.com/nolyofr/"
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-10 w-10 place-items-center rounded-full bg-cream/10 text-cream ring-1 ring-cream/15 transition hover:bg-cream/16 hover:ring-cream/30"
              aria-label="Nolyo sur Instagram"
              title="Instagram"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold tracking-[0.18em] text-cream/50 uppercase">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.to} className="wrap-break-word text-sm text-cream/80 transition hover:text-cream">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className="text-sm text-cream/80 transition hover:text-cream">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
              {column.title === 'Légal' ? (
                <li>
                  <button
                    type="button"
                    onClick={openConsentPreferences}
                    className="text-sm text-cream/80 transition hover:text-cream"
                  >
                    Cookies
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Nolyo. Tous droits réservés.</p>
          <p>Paiements sécurisés via Stripe.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
