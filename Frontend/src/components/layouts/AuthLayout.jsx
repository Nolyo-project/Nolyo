import { Outlet, useLocation } from 'react-router-dom'
import { isAdminHost, publicSiteHref } from '../../config/site'
import Logo from '../Logo'

const panels = {
  '/abonnement': {
    kicker: 'Premier mois offert',
    title: 'Vous demandez. On vous ouvre l’espace.',
    text: 'Choisissez Essentiel ou Pro, envoyez votre demande. On vous recontacte, puis un code unique donne accès à Nolyo.',
  },
  default: {
    kicker: 'Espace Nolyo',
    title: 'Vos clients, rendez-vous et comptes, au même endroit.',
    text: 'Un code unique, reçu après votre demande, ouvre votre tableau de bord.',
  },
  admin: {
    kicker: 'admin.nolyo.fr',
    title: 'Le bureau du fondateur.',
    text: 'Demandes, codes, comptes. Le site public reste sur nolyo.fr.',
  },
}

function AuthLayout() {
  const { pathname } = useLocation()
  const admin = isAdminHost()
  const panel = admin ? panels.admin : panels[pathname] || panels.default
  const wide = !admin && pathname === '/abonnement'
  const homeTo = admin ? publicSiteHref('/') : '/'

  return (
    <div className="min-h-svh bg-paper text-ink lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-moss text-cream lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute -top-20 right-[-20%] h-80 w-80 rounded-full bg-copper/30 blur-3xl"
          aria-hidden
        />
        <div>
          <Logo to={homeTo} inverted />
          <p className="mt-3 text-sm tracking-[0.04em] text-cream/55">
            {admin ? 'nolyo.fr' : 'Gérer. Présenter. Développer.'}
          </p>
        </div>
        <div className="relative max-w-md">
          <p className="inline-flex rounded-full bg-copper px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-cream uppercase">
            {panel.kicker}
          </p>
          <h1 className="mt-5 font-display text-5xl leading-tight font-semibold">{panel.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-cream/70">{panel.text}</p>
        </div>
        <p className="relative text-sm text-cream/45">© {new Date().getFullYear()} Nolyo</p>
      </aside>

      <div className="flex min-h-svh flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Logo to={homeTo} />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'}`}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
