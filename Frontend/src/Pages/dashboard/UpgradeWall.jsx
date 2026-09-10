import { Link } from 'react-router-dom'
import { formatPrice, plans } from '../../data/plans'
import { PageShell, Surface, icons, primaryBtn } from './ui'

const pro = plans.find((item) => item.id === 'pro')

const defaultHighlights = [
  'Page professionnelle et réservation en ligne',
  'Statistiques avancées',
  'Plusieurs connexions sur le même espace',
]

export function UpgradeWall({
  title,
  description = 'Cette vue fait partie de Nolyo Pro. Passez à 19,99 € par mois pour tout débloquer.',
  icon = 'lock',
  highlights = defaultHighlights,
}) {
  return (
    <PageShell className="grid min-h-[calc(100svh-5.5rem)] place-items-center py-12 lg:min-h-[calc(100svh-4.75rem)]">
      <Surface className="w-full max-w-lg px-5 py-10 text-center sm:px-12 sm:py-14">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-moss text-cream shadow-sm shadow-moss/25 [&_svg]:h-7 [&_svg]:w-7">
          {icons[icon] || icons.lock}
        </span>
        <p className="mt-6 text-[11px] font-semibold tracking-[0.22em] text-copper uppercase">Nolyo Pro</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>

        <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left text-sm">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-3 text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-copper" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Link
          to="/dashboard/abonnement?upgrade=pro"
          className={`${primaryBtn} mt-9 bg-copper px-7 py-3 hover:bg-copper-dark`}
        >
          Passer à Pro
        </Link>
        <p className="mt-3 text-sm text-ink-soft">
          {pro ? `${formatPrice(pro.price)} / ${pro.period}` : '19,99 € / mois'}
          <span className="text-ink/30"> · </span>
          Clients, agenda et notes conservés
        </p>
      </Surface>
    </PageShell>
  )
}

export function ProLock({ isPro, title, children, className = '' }) {
  if (isPro) return children

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] ${className}`.trim()}>
      <div className="pointer-events-none select-none blur-[8px] opacity-25" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-moss/75 px-5 py-6 text-center text-cream backdrop-blur-[2px]">
        <span className="rounded-full bg-cream/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
          Pro
        </span>
        <p className="mt-2 font-medium">{title}</p>
        <Link
          to="/dashboard/abonnement?upgrade=pro"
          className="mt-3 rounded-full bg-copper px-4 py-2 text-sm font-semibold text-cream transition hover:bg-copper-dark"
        >
          Débloquer
        </Link>
      </div>
    </div>
  )
}
