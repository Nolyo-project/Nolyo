import { Link } from 'react-router-dom'
import Logo from './Logo'

const columns = [
  {
    title: 'Produit',
    links: [
      { to: '/#fonctionnalites', label: 'Fonctionnalités' },
      { to: '/abonnement', label: 'Offres' },
      { to: '/#avis', label: 'Témoignages' },
    ],
  },
  {
    title: 'Compte',
    links: [
      { to: '/abonnement', label: 'Demande d’abonnement' },
      { to: '/inscription', label: 'Inscription (code)' },
      { to: '/login', label: 'Connexion' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { to: '/abonnement', label: 'Abonnement' },
      { to: '/#accueil', label: 'À propos' },
      { to: '/login', label: 'Support' },
    ],
  },
]

function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-moss text-cream">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo to="/" inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/70">
            Un espace sobre pour capturer, relier et faire mûrir vos idées —
            sans le bruit des outils trop chargés.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold tracking-[0.18em] text-cream/50 uppercase">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-cream/80 transition hover:text-cream">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 text-xs text-cream/55 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Nolio. Tous droits réservés.</p>
          <p>Fait avec exigence — Paris & ailleurs.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
