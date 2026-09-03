import { Outlet, useLocation } from 'react-router-dom'
import Logo from '../Logo'

const panels = {
  '/abonnement': {
    kicker: 'Demande d’abonnement',
    title: 'Vous demandez. Le président vous ouvre la suite.',
    text: 'Envoyez votre demande, recevez un devis, renvoyez-le signé avec le paiement. Un code unique vous sera alors transmis pour créer votre espace.',
  },
  default: {
    kicker: 'Espace Nolio',
    title: 'Un tableau de bord pour vos clients, rendez-vous et comptes.',
    text: 'Inscrivez-vous uniquement avec le code unique remis après devis signé et paiement.',
  },
}

function AuthLayout() {
  const { pathname } = useLocation()
  const panel = panels[pathname] || panels.default
  const wide = pathname === '/abonnement'

  return (
    <div className="min-h-svh bg-paper text-ink lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-moss text-cream lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute -top-20 right-[-20%] h-80 w-80 rounded-full bg-copper/30 blur-3xl"
          aria-hidden
        />
        <Logo to="/" inverted />
        <div className="relative max-w-md">
          <p className="text-xs font-semibold tracking-[0.22em] text-cream/55 uppercase">
            {panel.kicker}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-tight font-semibold">{panel.title}</h1>
          <p className="mt-5 text-cream/70">{panel.text}</p>
        </div>
        <p className="relative text-sm text-cream/45">© {new Date().getFullYear()} Nolio</p>
      </aside>

      <div className="flex min-h-svh flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Logo to="/" />
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
