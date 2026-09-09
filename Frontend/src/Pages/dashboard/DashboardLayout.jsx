import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan, planLabels } from '../../data/plans'
import Logo from '../../components/Logo'
import { formatDay, trialDaysLeft } from './format'
import { icons, Avatar } from './ui'
import FollowUpModal from './FollowUpModal'
import TrialBillingPrompt from './TrialBillingPrompt'
import { copyForUser } from '../../data/trades'
import { hasModule, workspaceLabel } from '../../data/workspace'

function navGroups(copy) {
  return [
    {
      label: copy.navGroup,
      links: [
        { to: '/dashboard', label: 'Vue d’ensemble', icon: 'home', end: true },
        { to: '/dashboard/taches', label: 'Tâches', icon: 'journal', module: 'tasks' },
        { to: '/dashboard/clients', label: copy.clients, icon: 'people' },
        { to: '/dashboard/prospects', label: copy.prospects, icon: 'prospect', module: 'prospects' },
      ],
    },
    {
      label: 'Agenda',
      links: [
        { to: '/dashboard/rdv', label: copy.appointments, icon: 'calendar', badge: 'rdv', module: 'appointments' },
        { to: '/dashboard/conges', label: 'Congés', icon: 'absence', pro: true },
        { to: '/dashboard/notes', label: 'Notes', icon: 'note', module: 'notes' },
      ],
    },
    {
      label: 'Vitrine',
      links: [
        { to: '/dashboard/page', label: 'Page', icon: 'page', pro: true, module: 'page' },
        { to: '/dashboard/qr-code', label: 'QR Code', icon: 'qr', pro: true, module: 'qr' },
      ],
    },
    {
      label: 'Suivi',
      links: [
        { to: '/dashboard/finances', label: 'Chiffre d’affaires', icon: 'wallet', module: 'finances' },
        { to: '/dashboard/relances', label: 'Relances', icon: 'bell', badge: 'reminders', module: 'reminders' },
        { to: '/dashboard/statistiques', label: 'Statistiques', icon: 'chart', pro: true, module: 'stats' },
        { to: '/dashboard/abonnement', label: 'Abonnement', icon: 'card' },
      ],
    },
  ]
}

const emptyBadges = { rdv: 0, reminders: 0 }

function seenKey(userId) {
  return `nolio_nav_seen:${userId}`
}

function readSeen(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(seenKey(userId)) || '{}')
    return {
      rdv: Number(raw.rdv) || 0,
      reminders: Number(raw.reminders) || 0,
    }
  } catch {
    return { ...emptyBadges }
  }
}

function badgeRouteKey(pathname) {
  if (pathname === '/dashboard/rdv' || pathname.startsWith('/dashboard/rdv/')) return 'rdv'
  if (pathname.startsWith('/dashboard/relances')) return 'reminders'
  return null
}

function formatBadge(count) {
  if (!count) return ''
  return count > 9 ? '9+' : String(count)
}

function navClass({ isActive, locked }) {
  if (locked) {
    return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
      isActive ? 'bg-cream/8 text-cream/40' : 'text-cream/32 hover:bg-cream/6 hover:text-cream/45'
    }`
  }
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
    isActive ? 'bg-cream font-medium text-moss shadow-sm' : 'text-cream/72 hover:bg-cream/8 hover:text-cream'
  }`
}

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function PreviewTag({ expiresAt }) {
  const [left, setLeft] = useState(() => new Date(expiresAt).getTime() - Date.now())

  useEffect(() => {
    const tick = () => setLeft(new Date(expiresAt).getTime() - Date.now())
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [expiresAt])

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="rounded-full bg-moss px-3 py-1.5 text-[11px] font-semibold tracking-wide text-cream uppercase">
        Nolyo Pro 19,99€
      </span>
      <span className="text-sm text-ink-soft">{formatClock(left)}</span>
    </div>
  )
}

function BillingHint({ subscription }) {
  const status = subscription?.status
  const nextAt = subscription?.nextInvoiceAt || subscription?.trialEndsAt || subscription?.currentPeriodEnd
  const hasCard = Boolean(subscription?.hasPaymentMethod)
  const auto = subscription?.collectionMethod === 'charge_automatically' && hasCard

  if (status === 'past_due' || status === 'unpaid') return null

  if (status === 'trialing') {
    const days = trialDaysLeft(subscription?.activatedAt, 30, subscription?.trialEndsAt)
    if (days <= 0) {
      return (
        <Link
          to="/dashboard/abonnement"
          className="max-w-[16rem] rounded-2xl border border-ink/10 bg-cream px-3 py-2 text-left text-xs transition hover:border-copper/30 sm:max-w-none sm:px-4"
        >
          <p className="font-medium">Mois offert terminé</p>
          <p className="mt-0.5 text-ink-soft">
            {hasCard ? 'Prélèvement en cours…' : 'Ajoutez une carte pour éviter le blocage.'}
          </p>
        </Link>
      )
    }
    return (
      <Link
        to="/dashboard/abonnement"
        className="max-w-[16rem] rounded-2xl bg-cream px-3 py-2 text-left text-xs ring-1 ring-ink/6 transition hover:ring-copper/25 sm:max-w-none sm:px-4"
      >
        <p className="m-0">
          <span className="font-medium">Mois offert</span>
          <span className="text-ink-soft"> · {days} j restant{days > 1 ? 's' : ''}</span>
        </p>
        {nextAt ? (
          <p className="mt-0.5 text-ink-soft">
            Prochaine facture le {formatDay(nextAt)}
            {hasCard ? ' · prélèvement auto' : ''}
          </p>
        ) : null}
      </Link>
    )
  }

  if (status === 'active' && nextAt) {
    return (
      <Link
        to="/dashboard/abonnement"
        className="max-w-[16rem] rounded-2xl bg-cream px-3 py-2 text-left text-xs ring-1 ring-ink/6 transition hover:ring-copper/25 sm:max-w-none sm:px-4"
      >
        <p className="font-medium">{auto ? 'Prélèvement automatique' : 'Prochaine facture'}</p>
        <p className="mt-0.5 text-ink-soft">Le {formatDay(nextAt)}</p>
      </Link>
    )
  }

  return null
}

function NavList({ user, isPro, badges = {}, onNavigate, className, copy }) {
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
    <nav className={`flex flex-col ${className || ''}`}>
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
              const count = !locked && link.badge ? badges[link.badge] || 0 : 0
              const label = formatBadge(count)
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => navClass({ isActive, locked })}
                  onClick={onNavigate}
                  title={locked ? 'Réservé à Nolyo Pro' : undefined}
                  aria-label={locked ? `${link.label} — réservé à Nolyo Pro` : undefined}
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
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function DashboardLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [badges, setBadges] = useState(emptyBadges)
  const [seen, setSeen] = useState(() => readSeen(user.id))
  const isPro = isProPlan(user)
  const isPreview = Boolean(user.preview)
  const copy = copyForUser(user)
  const spaceName = workspaceLabel(user)
  const planName = planLabels[user.subscription?.plan] || 'Nolyo'
  const leaveLabel = isPreview ? 'Quitter l’essai' : 'Déconnexion'
  const activeBadge = badgeRouteKey(pathname)

  useEffect(() => {
    setSeen(readSeen(user.id))
  }, [user.id])

  useEffect(() => {
    function load() {
      api('/api/workspace/nav-badges')
        .then((data) => setBadges(data.badges || emptyBadges))
        .catch(() => {})
    }
    load()
    const timer = window.setInterval(load, 30000)
    window.addEventListener('nolio-workspace-changed', load)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('nolio-workspace-changed', load)
    }
  }, [])

  useEffect(() => {
    if (!activeBadge) return
    const current = badges[activeBadge] || 0
    setSeen((previous) => {
      if (previous[activeBadge] === current) return previous
      const next = { ...previous, [activeBadge]: current }
      localStorage.setItem(seenKey(user.id), JSON.stringify(next))
      return next
    })
  }, [activeBadge, badges, user.id])

  const visibleBadges = useMemo(() => {
    const next = { ...emptyBadges }
    for (const key of Object.keys(emptyBadges)) {
      const count = badges[key] || 0
      next[key] = activeBadge === key || count <= (seen[key] || 0) ? 0 : count
    }
    return next
  }, [activeBadge, badges, seen])

  return (
    <div className="h-svh overflow-hidden bg-paper text-ink lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="dash-sidebar hidden h-svh flex-col text-cream lg:flex">
        <div className="flex flex-col items-start gap-2.5 px-5 pt-6 pb-4">
          <Logo to="/dashboard" inverted className="block" />
          {isPreview ? (
            <span className="rounded-full bg-cream/14 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-cream uppercase">
              Nolyo Pro 19,99€
            </span>
          ) : (
            <p className="text-[11px] font-semibold tracking-[0.18em] text-cream/55 uppercase">
              {planName}
            </p>
          )}
        </div>
        <NavList user={user} isPro={isPro} badges={visibleBadges} copy={copy} className="flex-1 overflow-y-auto px-3 pb-4" />
        <div className="border-t border-cream/10 px-4 py-4">
          <NavLink
            to="/dashboard/parametres"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-2 py-2 -mx-1 transition ${
                isActive ? 'bg-cream/12' : 'hover:bg-cream/8'
              }`
            }
          >
            <span className="shrink-0">
              <Avatar user={user} light className="h-10 w-10 text-xs" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-cream/50">Paramètres</p>
            </div>
          </NavLink>
          <div className="mt-3 flex items-center justify-between px-1">
            <Link to="/" className="text-xs text-cream/50 transition hover:text-cream">
              Site public
            </Link>
            <button
              type="button"
              onClick={() => logout(isPreview ? 'home' : undefined)}
              className="text-xs text-cream/50 transition hover:text-cream"
            >
              {leaveLabel}
            </button>
          </div>
        </div>
      </aside>

      <div className="dash-canvas flex min-h-0 min-w-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-ink/6 bg-cream/50 px-5 py-3 backdrop-blur-md lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <Logo to="/dashboard" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Espace</p>
              <p className="truncate text-sm font-medium">{spaceName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isPreview && user.previewExpiresAt ? (
              <PreviewTag expiresAt={user.previewExpiresAt} />
            ) : (
              <BillingHint subscription={user.subscription} />
            )}
            <button
              type="button"
              className="rounded-full border border-ink/10 bg-cream px-3 py-2 text-sm lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              Menu
            </button>
          </div>
        </header>

        {menuOpen ? (
          <div className="dash-sidebar shrink-0 px-3 py-4 lg:hidden">
            {isPreview ? (
              <p className="mb-3 px-3">
                <span className="inline-flex rounded-full bg-cream/14 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-cream uppercase">
                  Nolyo Pro 19,99€
                </span>
              </p>
            ) : null}
            <NavList user={user} isPro={isPro} badges={visibleBadges} copy={copy} onNavigate={() => setMenuOpen(false)} />
            <NavLink
              to="/dashboard/parametres"
              className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream/72 hover:bg-cream/8 hover:text-cream"
              onClick={() => setMenuOpen(false)}
            >
              <span className="shrink-0">
                <Avatar user={user} light className="h-9 w-9 text-xs" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-cream">{user.name}</span>
                <span className="block text-xs text-cream/50">Paramètres</span>
              </span>
            </NavLink>
            <div className="mt-4 flex items-center justify-between px-3">
              <Link to="/" className="text-sm text-cream/60" onClick={() => setMenuOpen(false)}>
                Site public
              </Link>
              <button
                type="button"
                className="text-sm text-cream/60"
                onClick={() => logout(isPreview ? 'home' : undefined)}
              >
                {leaveLabel}
              </button>
            </div>
          </div>
        ) : null}

        <div className="dash-scroll min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
        <FollowUpModal />
        <TrialBillingPrompt />
      </div>
    </div>
  )
}

export default DashboardLayout
