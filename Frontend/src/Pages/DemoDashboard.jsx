import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import Logo from '../components/Logo'
import { isProPlan, planLabels } from '../data/plans'
import { copyForUser } from '../data/trades'
import { hasModule, workspaceLabel } from '../data/workspace'
import { navGroups } from './dashboard/DashboardLayout'
import { OverviewView } from './dashboard/Overview'
import { Avatar, icons } from './dashboard/ui'

function formatBadge(count) {
  if (!count) return ''
  return count > 9 ? '9+' : String(count)
}

function DemoNav({ user, isPro, badges, copy }) {
  const groups = navGroups(copy)
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => {
        if (!link.module) return true
        if (link.pro && !isPro) return true
        return hasModule(user, link.module)
      }),
    }))
    .filter((group) => group.links.length)

  return (
    <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-4" aria-hidden>
      {groups.map((group) => (
        <div key={group.label}>
          <p
            className={`px-3 pt-4 pb-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase ${
              group.label === 'Vitrine' && !isPro ? 'text-cream/28' : 'text-cream/40'
            }`}
          >
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.links.map((link) => {
              const locked = Boolean(link.pro && !isPro)
              const active = Boolean(link.end)
              const count = !locked && link.badge ? badges[link.badge] || 0 : 0
              const label = formatBadge(count)
              return (
                <div
                  key={link.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                    locked
                      ? 'text-cream/32'
                      : active
                        ? 'bg-cream font-medium text-moss shadow-sm'
                        : 'text-cream/72'
                  }`}
                >
                  <span className={`relative shrink-0 ${locked ? 'opacity-50' : 'opacity-90'}`}>{icons[link.icon]}</span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{link.label}</span>
                    {label ? (
                      <span className="grid min-w-[1.15rem] place-items-center rounded-full bg-copper px-1.5 py-0.5 text-[10px] font-semibold text-cream">
                        {label}
                      </span>
                    ) : locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cream/8 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-cream/55 uppercase">
                        {icons.lock}
                        Pro
                      </span>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

/**
 * Aperçu public du vrai dashboard membre (compte fictif Maison Brume) — pour iframes landing.
 * Même chrome / vue d’ensemble que les clients, sans auth ni navigation.
 */
function DemoDashboard() {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/public/landing-demo')
      .then(setPayload)
      .catch((err) => setError(err.message))
  }, [])

  const user = payload?.user
  const data = payload?.overview
  const badges = payload?.badges || { rdv: 0, reminders: 0 }
  const isPro = user ? isProPlan(user) : true
  const copy = useMemo(() => copyForUser(user), [user])
  const spaceName = user ? workspaceLabel(user) : 'Maison Brume'
  const planName = planLabels[user?.subscription?.plan] || 'Nolyo Pro'

  return (
    <div className="grid h-dvh min-h-dvh grid-cols-[17.5rem_minmax(0,1fr)] overflow-hidden bg-paper text-ink">
      <aside className="dash-sidebar flex h-full min-h-0 flex-col text-cream" aria-hidden>
        <div className="flex flex-col items-start gap-2.5 px-5 pt-6 pb-4">
          <Logo to="/" inverted className="pointer-events-none block" />
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cream/55 uppercase">{planName}</p>
        </div>
        {user ? <DemoNav user={user} isPro={isPro} badges={badges} copy={copy} /> : <div className="flex-1" />}
        <div className="border-t border-cream/10 px-4 py-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="shrink-0">
              {user ? <Avatar user={user} light className="h-10 w-10 text-xs" /> : null}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || '…'}</p>
              <p className="truncate text-xs text-cream/50">Paramètres</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between px-1">
            <span className="text-xs text-cream/50">Site public</span>
            <span className="text-xs text-cream/50">Déconnexion</span>
          </div>
        </div>
      </aside>

      <div className="dash-canvas flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-ink/6 bg-cream/50 px-5 py-3 backdrop-blur-md lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Espace</p>
              <p className="truncate text-sm font-medium">{spaceName}</p>
            </div>
          </div>
          <span className="rounded-full bg-moss px-3 py-1.5 text-[11px] font-semibold tracking-wide text-cream uppercase">
            Aperçu
          </span>
        </header>

        <div className="dash-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
          {error ? (
            <p className="m-8 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : !user || !data ? (
            <p className="px-5 py-16 text-center text-ink-soft lg:px-10">Chargement de l’espace…</p>
          ) : (
            <OverviewView user={user} data={data} interactive={false} />
          )}
        </div>
      </div>
    </div>
  )
}

export default DemoDashboard
