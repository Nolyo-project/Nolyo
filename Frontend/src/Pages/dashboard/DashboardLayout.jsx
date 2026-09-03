import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan, planLabels } from '../../data/plans'
import Logo from '../../components/Logo'
import { trialDaysLeft } from './format'
import { icons, initials } from './ui'
import FollowUpModal from './FollowUpModal'

const groups = [
  {
    label: 'Atelier',
    links: [
      { to: '/dashboard', label: 'Vue d’ensemble', icon: 'home', end: true },
      { to: '/dashboard/taches', label: 'Tâches', icon: 'journal' },
      { to: '/dashboard/clients', label: 'Clients', icon: 'people' },
      { to: '/dashboard/prospects', label: 'Prospects', icon: 'prospect' },
      { to: '/dashboard/rdv', label: 'Rendez-vous', icon: 'calendar', badge: 'rdv' },
      { to: '/dashboard/notes', label: 'Notes', icon: 'note' },
    ],
  },
  {
    label: 'Suivi',
    links: [
      { to: '/dashboard/finances', label: 'Chiffre d’affaires', icon: 'wallet' },
      { to: '/dashboard/relances', label: 'Relances', icon: 'bell' },
    ],
  },
  {
    label: 'Nolio Pro',
    links: [
      { to: '/dashboard/inbox', label: 'Boîte de réception', icon: 'inbox', pro: true, badge: 'inbox' },
      { to: '/dashboard/statistiques', label: 'Statistiques', icon: 'chart', pro: true },
    ],
  },
]

const emptyBadges = { rdv: 0, reminders: 0, inbox: 0 }

function seenKey(userId) {
  return `nolio_nav_seen:${userId}`
}

function readSeen(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(seenKey(userId)) || '{}')
    return {
      rdv: Number(raw.rdv) || 0,
      reminders: Number(raw.reminders) || 0,
      inbox: Number(raw.inbox) || 0,
    }
  } catch {
    return { ...emptyBadges }
  }
}

function badgeRouteKey(pathname) {
  if (pathname === '/dashboard/rdv' || pathname.startsWith('/dashboard/rdv/')) return 'rdv'
  if (pathname.startsWith('/dashboard/relances')) return 'reminders'
  if (pathname.startsWith('/dashboard/inbox')) return 'inbox'
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

function TrialCounter({ activatedAt }) {
  const days = trialDaysLeft(activatedAt)

  if (days <= 0) {
    return (
      <div className="whitespace-nowrap rounded-full border border-ink/10 bg-cream px-4 py-2 text-sm">
        Période gratuite terminée
      </div>
    )
  }

  const remaining = `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`

  return (
    <div className="flex items-center gap-2 whitespace-nowrap rounded-full bg-cream px-4 py-2 text-sm ring-1 ring-ink/6 sm:px-5">
      <span className="h-1.5 w-1.5 rounded-full bg-copper" aria-hidden />
      <p className="m-0">
        <span className="">Période gratuite </span>
        <span className="text-ink-soft font-semibold"> {remaining}</span>
      </p>
    </div>
  )
}

function NavList({ isPro, badges = {}, onNavigate, className }) {
  return (
    <nav className={`flex flex-col ${className || ''}`}>
      {groups.map((group) => (
        <div key={group.label}>
          <p
            className={`px-3 pt-4 pb-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase ${
              group.label === 'Nolio Pro' && !isPro ? 'text-cream/28' : 'text-cream/40'
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
                  title={locked ? 'Réservé à Nolio Pro' : undefined}
                  aria-label={locked ? `${link.label} — réservé à Nolio Pro` : undefined}
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
  const planName = planLabels[user.subscription?.plan] || 'Nolio'
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
        <div className="px-5 pt-6 pb-4">
          <Logo to="/dashboard" inverted />
          <span className="mt-4 inline-flex rounded-full bg-cream/10 px-2.5 py-1 text-[11px] font-medium tracking-wide text-cream/70">
            {planName}
          </span>
        </div>
        <NavList isPro={isPro} badges={visibleBadges} className="flex-1 overflow-y-auto px-3 pb-4" />
        <div className="border-t border-cream/10 px-4 py-4">
          <NavLink
            to="/dashboard/parametres"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-2 py-2 -mx-1 transition ${
                isActive ? 'bg-cream/12' : 'hover:bg-cream/8'
              }`
            }
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream/12 text-xs font-semibold">
              {initials(user.name)}
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
              onClick={logout}
              className="text-xs text-cream/50 transition hover:text-cream"
            >
              Déconnexion
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
              <p className="truncate text-sm font-medium">{user.subscription?.company || user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TrialCounter activatedAt={user.subscription?.activatedAt} />
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
            <NavList isPro={isPro} badges={visibleBadges} onNavigate={() => setMenuOpen(false)} />
            <NavLink
              to="/dashboard/parametres"
              className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream/72 hover:bg-cream/8 hover:text-cream"
              onClick={() => setMenuOpen(false)}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream/12 text-xs font-semibold">
                {initials(user.name)}
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
              <button type="button" className="text-sm text-cream/60" onClick={logout}>
                Déconnexion
              </button>
            </div>
          </div>
        ) : null}

        <div className="dash-scroll min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
        <FollowUpModal />
      </div>
    </div>
  )
}

export default DashboardLayout
