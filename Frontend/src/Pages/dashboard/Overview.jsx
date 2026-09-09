import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { copyForUser, pluralLabel } from '../../data/trades'
import { hasModule } from '../../data/workspace'
import { formatDateTime, formatLongDate, formatMoney, formatTime } from './format'
import { EmptyState, PageShell, Surface, icons, primaryBtn } from './ui'

/** Contenu de la vue d’ensemble — réutilisé par le dashboard réel et l’aperçu landing. */
export function OverviewView({ user, data, interactive = true }) {
  const copy = copyForUser(user)
  const firstName = (user?.name || 'Bonjour').split(' ')[0]

  const nextItems = [
    ...(hasModule(user, 'appointments')
      ? (data.todayAppointments || []).slice(0, 3).map((item) => ({
          id: item._id,
          title: item.title,
          meta: `${formatTime(item.startAt)}${item.contact?.name ? ` · ${item.contact.name}` : ''}`,
          kind: copy.appointments,
          to: '/dashboard/rdv',
        }))
      : []),
    ...(hasModule(user, 'reminders')
      ? (data.reminders || []).slice(0, 3).map((item) => ({
          id: item._id,
          title: item.title,
          meta: formatDateTime(item.dueAt),
          kind: 'Relance',
          to: '/dashboard/relances',
        }))
      : []),
  ].slice(0, 5)

  const stats = [
    hasModule(user, 'finances')
      ? {
          to: '/dashboard/finances',
          label: 'Ce mois',
          value: formatMoney(data.monthIncome),
          hint: 'encaissé',
          tone: 'light',
        }
      : null,
    hasModule(user, 'appointments')
      ? {
          to: '/dashboard/rdv',
          label: 'Aujourd’hui',
          value: data.todayAppointments?.length || 0,
          hint: pluralLabel(copy.appointmentHint, data.todayAppointments?.length || 0),
          tone: 'light',
        }
      : null,
    {
      to: '/dashboard/clients',
      label: copy.clients,
      value: data.clients,
      hint: pluralLabel(copy.clientsSingular, data.clients),
      tone: 'light',
    },
    hasModule(user, 'reminders')
      ? {
          to: '/dashboard/relances',
          label: 'À relancer',
          value: data.pendingReminders,
          hint: 'en attente',
          tone: 'dark',
        }
      : null,
  ].filter(Boolean)

  const shortcuts = [
    hasModule(user, 'tasks') ? { to: '/dashboard/taches', label: 'Tâches du jour', icon: 'journal' } : null,
    { to: '/dashboard/clients', label: copy.newClient, icon: 'people' },
    hasModule(user, 'prospects') ? { to: '/dashboard/prospects', label: copy.newProspect, icon: 'prospect' } : null,
    hasModule(user, 'appointments') ? { to: '/dashboard/rdv', label: 'Ouvrir l’agenda', icon: 'calendar' } : null,
    hasModule(user, 'notes') ? { to: '/dashboard/notes', label: 'Ajouter une note', icon: 'note' } : null,
    hasModule(user, 'finances') ? { to: '/dashboard/finances', label: 'Saisir un montant', icon: 'wallet' } : null,
  ].filter(Boolean)

  function wrap(to, className, children) {
    if (!interactive) {
      return <div className={className}>{children}</div>
    }
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">{formatLongDate()}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-5xl">Bonjour, {firstName}.</h1>
          <p className="mt-2 text-ink-soft">{copy.overviewHint}</p>
          {user.page?.published && user.page?.slug && hasModule(user, 'page') ? (
            <p className="mt-3">
              {interactive ? (
                <Link to={`/p/${user.page.slug}`} className="text-sm font-medium text-copper hover:underline">
                  Voir ma page professionnelle
                </Link>
              ) : (
                <span className="text-sm font-medium text-copper">Voir ma page professionnelle</span>
              )}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) =>
          wrap(
            item.to,
            'group',
            <Surface
              className={`h-full p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-md ${
                item.tone === 'dark' ? '!bg-moss text-cream !ring-moss' : ''
              }`}
            >
              <p
                className={`text-[11px] font-semibold tracking-[0.16em] uppercase ${
                  item.tone === 'dark' ? 'text-cream/55' : 'text-ink-soft'
                }`}
              >
                {item.label}
              </p>
              <p className="mt-3 font-display text-3xl tracking-tight">{item.value}</p>
              <p className={`mt-1 text-sm ${item.tone === 'dark' ? 'text-cream/70' : 'text-ink-soft'}`}>{item.hint}</p>
            </Surface>,
          ),
        )}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_20rem]">
        <Surface className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Maintenant</h2>
              <p className="mt-1 text-sm text-ink-soft">Ce qui arrive ensuite.</p>
            </div>
            {hasModule(user, 'appointments') ? (
              interactive ? (
                <Link to="/dashboard/rdv" className="text-sm font-medium text-copper hover:underline">
                  {copy.agendaKicker}
                </Link>
              ) : (
                <span className="text-sm font-medium text-copper">{copy.agendaKicker}</span>
              )
            ) : null}
          </div>
          {nextItems.length === 0 ? (
            <div className="mt-6">
              <EmptyState>
                Rien de prévu pour l’instant.
                {hasModule(user, 'appointments') && interactive ? (
                  <Link to="/dashboard/rdv" className={`${primaryBtn} mt-4`}>
                    Voir l’agenda
                  </Link>
                ) : null}
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-ink/8">
              {nextItems.map((item) => (
                <li key={item.id}>
                  {wrap(
                    item.to,
                    'flex items-start justify-between gap-4 py-3.5 first:pt-0 hover:opacity-80',
                    <>
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-copper uppercase">{item.kind}</p>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-ink-soft">{item.meta}</p>
                      </div>
                      <span className="mt-1 text-ink-soft/40" aria-hidden>
                        →
                      </span>
                    </>,
                  )}
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
              <li key={item.to}>
                {wrap(
                  item.to,
                  'group flex items-center gap-3 rounded-2xl bg-paper px-3 py-3 text-sm font-medium transition hover:bg-moss hover:text-cream',
                  <>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-moss/10 text-moss transition group-hover:bg-cream/15 group-hover:text-cream">
                      {icons[item.icon]}
                    </span>
                    {item.label}
                  </>,
                )}
              </li>
            ))}
          </ul>
        </Surface>
      </section>
    </PageShell>
  )
}

function Overview() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/workspace/overview')
      .then((res) => setData(res.overview))
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return <p className="m-8 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
  }

  if (!data) {
    return <p className="px-5 py-16 text-center text-ink-soft lg:px-10">Chargement de votre espace…</p>
  }

  return <OverviewView user={user} data={data} />
}

export default Overview
