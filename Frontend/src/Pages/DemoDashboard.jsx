import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Logo from '../components/Logo'
import { formatDateTime, formatLongDate, formatMoney, formatTime } from './dashboard/format'
import { EmptyState, PageShell, Surface, icons } from './dashboard/ui'

const NAV = [
  { label: 'Vue d’ensemble', icon: 'home', active: true },
  { label: 'Tâches', icon: 'journal' },
  { label: 'Clients', icon: 'people' },
  { label: 'Rendez-vous', icon: 'calendar' },
  { label: 'Notes', icon: 'note' },
  { label: 'Chiffre d’affaires', icon: 'wallet' },
  { label: 'Relances', icon: 'bell' },
  { label: 'Page', icon: 'page' },
]

/** Aperçu public du vrai dashboard (compte démo Maison Brume) — pour iframes landing. */
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
  const firstName = user?.name?.split(' ')[0] || 'Inès'

  const nextItems = data
    ? [
        ...(data.todayAppointments || []).slice(0, 3).map((item) => ({
          id: item._id,
          title: item.title,
          meta: `${formatTime(item.startAt)}${item.contact?.name ? ` · ${item.contact.name}` : ''}`,
          kind: 'Rendez-vous',
        })),
        ...(data.reminders || []).slice(0, 3).map((item) => ({
          id: item._id,
          title: item.title,
          meta: formatDateTime(item.dueAt),
          kind: 'Relance',
        })),
      ].slice(0, 5)
    : []

  const stats = data
    ? [
        { label: 'Ce mois', value: formatMoney(data.monthIncome), hint: 'encaissé', tone: 'light' },
        {
          label: 'Aujourd’hui',
          value: data.todayAppointments?.length || 0,
          hint: 'rendez-vous',
          tone: 'light',
        },
        { label: 'Clients', value: data.clients, hint: 'au carnet', tone: 'light' },
        { label: 'À relancer', value: data.pendingReminders, hint: 'en attente', tone: 'dark' },
      ]
    : []

  const shortcuts = [
    { label: 'Tâches du jour', icon: 'journal' },
    { label: 'Nouveau client', icon: 'people' },
    { label: 'Ouvrir l’agenda', icon: 'calendar' },
    { label: 'Ajouter une note', icon: 'note' },
    { label: 'Saisir un montant', icon: 'wallet' },
  ]

  return (
    <div className="h-svh overflow-hidden bg-paper text-ink lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="dash-sidebar hidden h-svh flex-col text-cream lg:flex" aria-hidden>
        <div className="flex flex-col items-start gap-2.5 px-5 pt-6 pb-4">
          <Logo to="/" inverted className="pointer-events-none block" />
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cream/55 uppercase">Nolyo Pro</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {NAV.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                item.active ? 'bg-cream font-medium text-moss shadow-sm' : 'text-cream/72'
              }`}
            >
              <span className="opacity-90">{icons[item.icon]}</span>
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="border-t border-cream/10 px-4 py-4">
          <div className="flex items-center gap-3 px-1">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-cream/15 text-xs font-semibold">
              {(user?.name || 'ID')
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || '…'}</p>
              <p className="truncate text-xs text-cream/50">{user?.company || 'Maison Brume'}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="dash-canvas flex min-h-0 min-w-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-ink/6 bg-cream/50 px-5 py-3 backdrop-blur-md lg:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Espace</p>
            <p className="truncate text-sm font-medium">{user?.company || 'Maison Brume'}</p>
          </div>
          <span className="rounded-full bg-moss px-3 py-1.5 text-[11px] font-semibold tracking-wide text-cream uppercase">
            Aperçu
          </span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <p className="m-8 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : !data ? (
            <p className="px-5 py-16 text-center text-ink-soft">Chargement de l’espace…</p>
          ) : (
            <PageShell>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
                  {formatLongDate()}
                </p>
                <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-5xl">Bonjour, {firstName}.</h1>
                <p className="mt-2 text-ink-soft">Voici le fil du jour — clients, agenda, ce qui rentre.</p>
              </div>

              <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                  <Surface
                    key={item.label}
                    className={`h-full p-5 ${item.tone === 'dark' ? '!bg-moss text-cream !ring-moss' : ''}`}
                  >
                    <p
                      className={`text-[11px] font-semibold tracking-[0.16em] uppercase ${
                        item.tone === 'dark' ? 'text-cream/55' : 'text-ink-soft'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="mt-3 font-display text-3xl tracking-tight">{item.value}</p>
                    <p className={`mt-1 text-sm ${item.tone === 'dark' ? 'text-cream/70' : 'text-ink-soft'}`}>
                      {item.hint}
                    </p>
                  </Surface>
                ))}
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_20rem]">
                <Surface className="p-6">
                  <h2 className="font-display text-2xl">Maintenant</h2>
                  <p className="mt-1 text-sm text-ink-soft">Ce qui arrive ensuite.</p>
                  {nextItems.length === 0 ? (
                    <div className="mt-6">
                      <EmptyState>Rien de prévu pour l’instant.</EmptyState>
                    </div>
                  ) : (
                    <ul className="mt-5 divide-y divide-ink/8">
                      {nextItems.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-4 py-3.5 first:pt-0">
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-copper uppercase">{item.kind}</p>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-ink-soft">{item.meta}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Surface>

                <Surface className="p-6">
                  <h2 className="font-display text-2xl">Accès rapides</h2>
                  <p className="mt-1 text-sm text-ink-soft">Les gestes du quotidien.</p>
                  <ul className="mt-5 space-y-2">
                    {shortcuts.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-3 text-sm font-medium"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-moss/10 text-moss">
                          {icons[item.icon]}
                        </span>
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </Surface>
              </section>
            </PageShell>
          )}
        </div>
      </div>
    </div>
  )
}

export default DemoDashboard
