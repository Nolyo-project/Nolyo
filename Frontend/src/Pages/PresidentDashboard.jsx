import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import { founderHomePath, publicSiteHref } from '../config/site'
import Appointments from './dashboard/Appointments'
import { formatTime } from './dashboard/format'
import { Avatar } from './dashboard/ui'
import { DashFrame, MenuToggle, MobileDrawer } from '../components/layouts/AppShell'
import FinancesView from './president/FinancesView'
import MembersView from './president/MembersView'
import RequestsView from './president/RequestsView'
import SettingsView from './president/SettingsView'
import TestimonialsView from './president/TestimonialsView'
import AnalyticsView from './president/AnalyticsView'
import MaintenanceView from './president/MaintenanceView'
import {
  Empty,
  Stat,
  deletionLabels,
  formatDate,
  formatDay,
  matchesQuery,
  navClass,
  planName,
  statusHint,
  statusLabels,
} from './president/shared'

function PresidentDashboard() {
  const { user, logout } = useAuth()
  const [view, setView] = useState('home')
  const [query, setQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [requests, setRequests] = useState([])
  const [counts, setCounts] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [deletions, setDeletions] = useState([])
  const [deletionCounts, setDeletionCounts] = useState({})
  const [selectedDeletionId, setSelectedDeletionId] = useState(null)
  const [members, setMembers] = useState([])
  const [memberCounts, setMemberCounts] = useState({})
  const [focusMemberId, setFocusMemberId] = useState(null)
  const [quoteNote, setQuoteNote] = useState('')
  const [refusalNote, setRefusalNote] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [rdvBadge, setRdvBadge] = useState(0)
  const [testimonialsBadge, setTestimonialsBadge] = useState(0)
  const [upcomingRdv, setUpcomingRdv] = useState([])

  const q = query.trim().toLowerCase()
  const firstName = user.name.split(' ')[0]
  const selectedDeletion = useMemo(
    () => deletions.find((item) => item.id === selectedDeletionId) || null,
    [deletions, selectedDeletionId],
  )

  const filteredDeletions = useMemo(() => {
    return deletions.filter(
      (item) =>
        matchesQuery(item.company, q) ||
        matchesQuery(item.name, q) ||
        matchesQuery(item.email, q) ||
        matchesQuery(item.message, q),
    )
  }, [deletions, q])

  const searchHits = q
    ? {
        requests: requests
          .filter(
            (item) =>
              matchesQuery(item.company, q) ||
              matchesQuery(item.name, q) ||
              matchesQuery(item.email, q) ||
              matchesQuery(item.inviteCode, q),
          )
          .slice(0, 8),
        members: members
          .filter(
            (item) =>
              matchesQuery(item.company, q) ||
              matchesQuery(item.name, q) ||
              matchesQuery(item.email, q) ||
              matchesQuery(item.slug, q) ||
              matchesQuery(item.city, q),
          )
          .slice(0, 8),
        deletions: filteredDeletions.slice(0, 8),
      }
    : null
  const searchTotal = searchHits
    ? searchHits.requests.length + searchHits.members.length + searchHits.deletions.length
    : 0

  const inbox = requests.filter((item) => item.status !== 'registered')
  const todoRequests = requests.filter((item) => item.status === 'received')
  const codeReady = requests.filter((item) => item.status === 'code_issued')
  const pendingDeletionsList = deletions.filter((item) => item.status === 'pending')
  const pendingDeletions = deletionCounts.pending || pendingDeletionsList.length
  const todoCount = todoRequests.length + codeReady.length + pendingDeletions
  const recentMembers = members.slice(0, 3)

  async function load() {
    const from = new Date()
    const to = new Date(Date.now() + 14 * 86400000)
    const [subs, dels, mems, badges, rdv] = await Promise.all([
      api('/api/president/requests'),
      api('/api/president/deletions'),
      api('/api/president/members'),
      api('/api/president/badges').catch(() => ({ badges: { rdv: 0, testimonials: 0 } })),
      api(
        `/api/president/appointments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      ).catch(() => ({ appointments: [] })),
    ])
    setCounts(subs.counts || {})
    setRequests(subs.requests || [])
    setSelectedId((current) =>
      current && subs.requests?.some((item) => item.id === current) ? current : null,
    )
    setDeletionCounts(dels.counts || {})
    setDeletions(dels.requests || [])
    setSelectedDeletionId((current) => current || dels.requests?.[0]?.id || null)
    setMemberCounts(mems.counts || {})
    setMembers(mems.members || [])
    setRdvBadge(badges.badges?.rdv || 0)
    setTestimonialsBadge(badges.badges?.testimonials || 0)
    setUpcomingRdv(
      (rdv.appointments || [])
        .filter((item) => item.status === 'planned' && new Date(item.startAt) >= from)
        .slice(0, 3),
    )
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
    function refresh() {
      load().catch(() => {})
    }
    window.addEventListener('nolio-workspace-changed', refresh)
    return () => window.removeEventListener('nolio-workspace-changed', refresh)
  }, [])

  function openRequest(id) {
    setSelectedId(id)
    setView('subscriptions')
    setMenuOpen(false)
  }

  function openStage() {
    setSelectedId(null)
    setView('subscriptions')
    setMenuOpen(false)
  }

  function openDeletion(id) {
    setSelectedDeletionId(id)
    setView('deletions')
    setMenuOpen(false)
  }

  function openMember(id) {
    setFocusMemberId(id)
    setPlanFilter('all')
    setQuery('')
    setView('members')
    setMenuOpen(false)
  }

  function go(id) {
    setView(id)
    setMenuOpen(false)
  }

  async function run(id, action) {
    setError('')
    setPending(true)
    try {
      const data = await api(`/api/president/requests/${id}/${action}`, {
        method: 'POST',
        body: action === 'send-quote' ? { quoteNote } : undefined,
      })
      setRequests((current) =>
        current.map((item) =>
          item.id === data.request.id ? { ...item, ...data.request, avatar: data.request.avatar || item.avatar } : item,
        ),
      )
      setSelectedId(data.request.id)
      if (action === 'send-quote') setQuoteNote('')
      const next = await api('/api/president/requests')
      setCounts(next.counts || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  function updateRequest(request) {
    setRequests((current) =>
      current.map((item) => (item.id === request.id ? { ...item, ...request, avatar: request.avatar || item.avatar } : item)),
    )
  }

  async function resolveDeletion(action) {
    if (!selectedDeletion) return
    setError('')
    setPending(true)
    try {
      const data = await api(`/api/president/deletions/${selectedDeletion.id}/${action}`, {
        method: 'POST',
        body: action === 'refuse' ? { note: refusalNote } : undefined,
      })
      setDeletions((current) => current.map((item) => (item.id === data.request.id ? data.request : item)))
      setSelectedDeletionId(data.request.id)
      setRefusalNote('')
      const next = await api('/api/president/deletions')
      setDeletionCounts(next.counts || {})
      if (action === 'accept') {
        const mems = await api('/api/president/members')
        setMemberCounts(mems.counts || {})
        setMembers(mems.members || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function copyCode(code) {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const titles = {
    home: 'Vue d’ensemble',
    analytics: 'Analyse',
    subscriptions: 'Demandes',
    rdv: 'Rendez-vous',
    members: 'Membres',
    finances: 'Chiffre d’affaires',
    testimonials: 'Avis',
    maintenance: 'Site / maintenance',
    settings: 'Paramètres',
    deletions: 'Suppressions',
  }

  const navItems = [
    ['home', 'Vue d’ensemble'],
    ['analytics', 'Analyse'],
    ['subscriptions', 'Demandes'],
    ['rdv', 'Rendez-vous'],
    ['members', 'Membres'],
    ['finances', 'Chiffre d’affaires'],
    ['testimonials', 'Avis'],
    ['maintenance', 'Site / maintenance'],
    ['deletions', 'Suppressions'],
  ]

  function renderSidebar() {
    return (
      <>
        <div className="px-5 pt-6 pb-4">
          <Logo to={founderHomePath()} inverted />
          <p className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-cream/50 uppercase">Fondateur</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {navItems.map(([id, label]) => (
            <button key={id} type="button" className={navClass(view === id)} onClick={() => go(id)}>
              <span>{label}</span>
              {id === 'subscriptions' && todoRequests.length ? (
                <span className="grid min-w-[1.15rem] place-items-center rounded-full bg-copper px-1.5 py-0.5 text-[10px] font-semibold">
                  {todoRequests.length}
                </span>
              ) : null}
              {id === 'rdv' && rdvBadge ? (
                <span className="grid min-w-[1.15rem] place-items-center rounded-full bg-copper px-1.5 py-0.5 text-[10px] font-semibold">
                  {rdvBadge}
                </span>
              ) : null}
              {id === 'deletions' && pendingDeletions ? (
                <span className="grid min-w-[1.15rem] place-items-center rounded-full bg-copper px-1.5 py-0.5 text-[10px] font-semibold">
                  {pendingDeletions}
                </span>
              ) : null}
              {id === 'testimonials' && testimonialsBadge ? (
                <span className="grid min-w-[1.15rem] place-items-center rounded-full bg-copper px-1.5 py-0.5 text-[10px] font-semibold">
                  {testimonialsBadge}
                </span>
              ) : null}
            </button>
          ))}
          <a href={publicSiteHref('/')} className="mt-4 rounded-xl px-3 py-2.5 text-sm text-cream/55 hover:bg-cream/8 hover:text-cream">
            Site public
          </a>
        </nav>
        <div className="border-t border-cream/10 px-4 py-4">
          <button
            type="button"
            onClick={() => go('settings')}
            className={`-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
              view === 'settings' ? 'bg-cream/12' : 'hover:bg-cream/8'
            }`}
          >
            <Avatar user={user} light className="h-10 w-10 text-xs" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-cream/50">Paramètres</p>
            </div>
          </button>
          <button type="button" onClick={logout} className="mt-3 px-1 text-xs text-cream/50 hover:text-cream">
            Déconnexion
          </button>
        </div>
      </>
    )
  }

  return (
    <DashFrame
      lockViewport={false}
      colsClass="lg:grid-cols-[16.75rem_minmax(0,1fr)]"
      sidebar={renderSidebar()}
      drawer={
        <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Bureau">
          {renderSidebar()}
        </MobileDrawer>
      }
    >
      <div className="dash-canvas min-w-0">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-ink/6 bg-cream/90 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-10">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Bureau Nolyo</p>
              <h1 className="truncate font-display text-xl tracking-tight sm:text-2xl">{titles[view]}</h1>
            </div>
            <MenuToggle open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
          </div>
          {view === 'rdv' ? (
            <a
              href={publicSiteHref('/rdv')}
              className="w-fit max-w-full truncate rounded-full border border-ink/10 bg-cream px-4 py-2 text-sm font-medium"
            >
              Page publique · /rdv
            </a>
          ) : view === 'settings' || view === 'finances' || view === 'analytics' || view === 'maintenance' ? null : (
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un nom, un e-mail, une société…"
              className="w-full min-w-0 rounded-full border border-ink/10 bg-cream px-4 py-2 text-sm outline-none focus:border-copper sm:max-w-md"
            />
          )}
        </header>

        <div
          className={
            view === 'rdv'
              ? 'min-w-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]'
              : 'min-w-0 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:px-10 lg:py-8'
          }
        >
          {error ? <p className="mb-4 shrink-0 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

          {view === 'home' && q ? (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">Recherche</p>
                <h2 className="mt-1 font-display text-3xl tracking-tight">
                  {searchTotal ? `${searchTotal} résultat${searchTotal > 1 ? 's' : ''}` : 'Aucun résultat'}
                </h2>
              </div>
              {searchHits.requests.length ? (
                <section>
                  <h3 className="text-sm font-semibold text-ink-soft">Demandes</h3>
                  <ul className="mt-3 space-y-2">
                    {searchHits.requests.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openRequest(item.id)}
                          className="flex w-full items-center justify-between gap-4 rounded-2xl bg-cream px-5 py-4 text-left ring-1 ring-ink/6 hover:bg-paper-2"
                        >
                          <span>
                            <span className="block font-medium">{item.company}</span>
                            <span className="block text-sm text-ink-soft">
                              {item.name} · {statusLabels[item.status]}
                            </span>
                          </span>
                          <span className="text-ink-soft/40">→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {searchHits.members.length ? (
                <section>
                  <h3 className="text-sm font-semibold text-ink-soft">Membres</h3>
                  <ul className="mt-3 space-y-2">
                    {searchHits.members.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openMember(item.id)}
                          className="flex w-full items-center justify-between gap-4 rounded-2xl bg-cream px-5 py-4 text-left ring-1 ring-ink/6 hover:bg-paper-2"
                        >
                          <span>
                            <span className="block font-medium">{item.company || item.name}</span>
                            <span className="block text-sm text-ink-soft">{item.email}</span>
                          </span>
                          <span className="text-ink-soft/40">→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {searchHits.deletions.length ? (
                <section>
                  <h3 className="text-sm font-semibold text-ink-soft">Suppressions</h3>
                  <ul className="mt-3 space-y-2">
                    {searchHits.deletions.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openDeletion(item.id)}
                          className="flex w-full items-center justify-between gap-4 rounded-2xl bg-cream px-5 py-4 text-left ring-1 ring-ink/6 hover:bg-paper-2"
                        >
                          <span>
                            <span className="block font-medium">{item.company || item.name}</span>
                            <span className="block text-sm text-ink-soft">{deletionLabels[item.status]}</span>
                          </span>
                          <span className="text-ink-soft/40">→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : view === 'home' ? (
            <div className="flex flex-col gap-4">
              <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">Aujourd’hui</p>
                  <h2 className="mt-0.5 font-display text-2xl tracking-tight sm:text-3xl">Bonjour, {firstName}.</h2>
                </div>
                <p className="text-sm text-ink-soft">
                  {todoCount
                    ? `${todoCount} action${todoCount > 1 ? 's' : ''} en attente.`
                    : 'Rien à traiter. Tout est à jour.'}
                </p>
              </div>

              <section className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                  label="À traiter"
                  value={counts.received || 0}
                  hint="nouvelles demandes"
                  tone="dark"
                  onClick={() => openStage()}
                />
                <Stat label="Codes prêts" value={counts.code_issued || 0} hint="à transmettre" onClick={() => openStage()} />
                <Stat
                  label="Membres"
                  value={memberCounts.total || 0}
                  hint={`${memberCounts.pro || 0} Pro · ${memberCounts.essentiel || 0} Essentiel`}
                  onClick={() => go('members')}
                />
                <Stat label="Suppressions" value={pendingDeletions} hint="à décider" onClick={() => go('deletions')} />
              </section>

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_17rem]">
                <article className="rounded-3xl bg-cream p-5 ring-1 ring-ink/6">
                  <div className="flex shrink-0 items-center justify-between gap-3">
                    <h3 className="font-display text-2xl">La file</h3>
                    <button type="button" className="text-sm font-medium text-copper" onClick={() => go('subscriptions')}>
                      Tout voir
                    </button>
                  </div>
                  {inbox.length === 0 && pendingDeletionsList.length === 0 ? (
                    <p className="mt-5 text-sm text-ink-soft">Aucune demande en cours.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-ink/8">
                      {inbox.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => openRequest(item.id)}
                            className="flex w-full items-start justify-between gap-4 py-2.5 text-left hover:opacity-80"
                          >
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold tracking-wide text-copper uppercase">
                                {statusLabels[item.status]}
                                {item.issueNote ? ' · alerte' : ''}
                              </p>
                              <p className="truncate font-medium">{item.company}</p>
                              <p className="truncate text-sm text-ink-soft">{statusHint[item.status]}</p>
                            </div>
                            <span className="mt-1 text-ink-soft/40">→</span>
                          </button>
                        </li>
                      ))}
                      {pendingDeletionsList.slice(0, 1).map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => openDeletion(item.id)}
                            className="flex w-full items-start justify-between gap-4 py-2.5 text-left hover:opacity-80"
                          >
                            <div>
                              <p className="text-[11px] font-semibold tracking-wide text-copper uppercase">Suppression</p>
                              <p className="font-medium">{item.company || item.name}</p>
                            </div>
                            <span className="mt-1 text-ink-soft/40">→</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>

                <article className="rounded-3xl bg-cream p-5 ring-1 ring-ink/6">
                  <div className="flex shrink-0 items-center justify-between gap-3">
                    <h3 className="font-display text-2xl">Rendez-vous</h3>
                    <button type="button" className="text-sm font-medium text-copper" onClick={() => go('rdv')}>
                      Agenda
                    </button>
                  </div>
                  {upcomingRdv.length === 0 ? (
                    <p className="mt-5 text-sm text-ink-soft">Aucun créneau réservé pour les deux prochaines semaines.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-ink/8">
                      {upcomingRdv.map((item) => (
                        <li key={item._id} className="py-2.5">
                          <p className="truncate font-medium">{item.contact?.name || item.title}</p>
                          <p className="text-sm text-ink-soft">
                            {new Date(item.startAt).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            · {formatTime(item.startAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>

                <article className="rounded-3xl bg-moss p-5 text-cream">
                  <div className="flex shrink-0 items-center justify-between gap-3">
                    <h3 className="font-display text-2xl">Membres</h3>
                    <button type="button" className="text-sm font-medium text-cream/80 hover:text-cream" onClick={() => go('members')}>
                      Tous
                    </button>
                  </div>
                  {recentMembers.length === 0 ? (
                    <p className="mt-5 text-sm text-cream/70">Personne pour le moment.</p>
                  ) : (
                    <ul className="mt-4 flex flex-col gap-2">
                      {recentMembers.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => openMember(item.id)}
                            className="flex w-full items-center gap-3 rounded-2xl bg-cream/10 px-3.5 py-3 text-left ring-1 ring-cream/10 transition hover:bg-cream/16"
                          >
                            <Avatar user={item} light className="h-11 w-11 text-xs" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{item.company || item.name}</span>
                              <span className="mt-0.5 block text-xs text-cream/65">
                                {planName(item.plan)}
                                <span className="mx-1 opacity-50">·</span>
                                {formatDay(item.activatedAt || item.createdAt)}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </section>
            </div>
          ) : null}

          {view === 'subscriptions' ? (
            <RequestsView
              requests={requests}
              counts={counts}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              quoteNote={quoteNote}
              setQuoteNote={setQuoteNote}
              pending={pending}
              copied={copied}
              onCopy={copyCode}
              onRun={run}
              onUpdate={updateRequest}
              q={q}
            />
          ) : null}

          {view === 'rdv' ? <Appointments variant="founder" compact /> : null}

          {view === 'members' ? (
            <MembersView
              members={members}
              memberCounts={memberCounts}
              q={q}
              planFilter={planFilter}
              setPlanFilter={setPlanFilter}
              focusId={focusMemberId}
              onFocusConsumed={() => setFocusMemberId(null)}
            />
          ) : null}

          {view === 'finances' ? <FinancesView /> : null}

          {view === 'analytics' ? <AnalyticsView /> : null}

          {view === 'maintenance' ? <MaintenanceView /> : null}

          {view === 'testimonials' ? <TestimonialsView /> : null}

          {view === 'settings' ? <SettingsView /> : null}

          {view === 'deletions' ? (
            <div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="À traiter" value={deletionCounts.pending || 0} tone="dark" />
                <Stat label="Fermés" value={deletionCounts.accepted || 0} />
                <Stat label="Refusées" value={deletionCounts.refused || 0} />
              </div>

              {filteredDeletions.length === 0 ? (
                <div className="mt-8">
                  <Empty>{q ? 'Aucun résultat.' : 'Aucune demande de suppression.'}</Empty>
                </div>
              ) : (
                <section className="mt-8 grid gap-6 lg:grid-cols-[18.5rem_minmax(0,1fr)]">
                  <ul className="space-y-2">
                    {filteredDeletions.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedDeletionId(item.id)}
                          className={`w-full rounded-2xl px-4 py-3 text-left ring-1 ${
                            selectedDeletion?.id === item.id
                              ? 'bg-moss text-cream ring-moss'
                              : 'bg-cream ring-ink/6 hover:bg-paper-2'
                          }`}
                        >
                          <p className="font-medium">{item.company || item.name}</p>
                          <p className={`text-xs ${selectedDeletion?.id === item.id ? 'text-cream/70' : 'text-ink-soft'}`}>
                            {deletionLabels[item.status]}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {selectedDeletion ? (
                    <article className="rounded-3xl bg-cream p-6 ring-1 ring-ink/6 sm:p-8">
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">
                        {deletionLabels[selectedDeletion.status]}
                      </p>
                      <h2 className="mt-1 font-display text-3xl">{selectedDeletion.company || selectedDeletion.name}</h2>
                      <p className="mt-1 text-ink-soft">
                        {selectedDeletion.name} · {selectedDeletion.email}
                        {selectedDeletion.plan ? ` · ${planName(selectedDeletion.plan)}` : ''}
                      </p>
                      <p className="mt-2 text-xs text-ink-soft">Reçue le {formatDate(selectedDeletion.createdAt)}</p>
                      <p className="mt-6 rounded-2xl bg-paper px-4 py-4 text-sm leading-relaxed">{selectedDeletion.message}</p>
                      {selectedDeletion.refusalNote ? (
                        <p className="mt-4 text-sm">
                          Réponse : <span className="text-ink-soft">{selectedDeletion.refusalNote}</span>
                        </p>
                      ) : null}
                      {selectedDeletion.status === 'pending' ? (
                        <div className="mt-8 space-y-4">
                          <label className="block text-sm font-medium">
                            Note, si vous refusez
                            <input
                              className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-sm outline-none focus:border-copper"
                              value={refusalNote}
                              onChange={(event) => setRefusalNote(event.target.value)}
                            />
                          </label>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => resolveDeletion('accept')}
                              className="rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
                            >
                              Fermer le compte
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => resolveDeletion('refuse')}
                              className="rounded-full border border-ink/10 bg-paper px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                            >
                              Garder le compte
                            </button>
                          </div>
                        </div>
                      ) : selectedDeletion.status === 'accepted' ? (
                        <p className="mt-6 text-sm text-moss">Fermé le {formatDate(selectedDeletion.resolvedAt)}.</p>
                      ) : (
                        <p className="mt-6 text-sm text-ink-soft">Refusée le {formatDate(selectedDeletion.resolvedAt)}.</p>
                      )}
                    </article>
                  ) : (
                    <Empty>Choisissez une demande.</Empty>
                  )}
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </DashFrame>
  )
}

export default PresidentDashboard
