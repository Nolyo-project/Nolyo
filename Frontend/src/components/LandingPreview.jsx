import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, mediaUrl } from '../api/client'
import { demoPublicPage, loadPublicPage } from '../data/demoPublicPage'
import { formatMoney } from '../Pages/dashboard/format'
import { planLabels } from '../data/plans'
import { copyForUser } from '../data/trades'
import { workspaceLabel } from '../data/workspace'

const FALLBACK = demoPublicPage('maison-brume')

function Chrome({ title, children }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-paper shadow-2xl shadow-ink/15 ring-1 ring-ink/10 sm:rounded-[1.5rem]">
      <div className="flex items-center gap-2 border-b border-ink/8 bg-cream px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <p className="ml-2 truncate text-[11px] text-ink-soft">{title}</p>
      </div>
      {children}
    </div>
  )
}

export function LandingDashPreview({ label = 'Maison Brume' }) {
  const [payload, setPayload] = useState(null)

  useEffect(() => {
    api('/api/public/landing-demo')
      .then(setPayload)
      .catch(() => setPayload({}))
  }, [])

  const user = payload?.user
  const overview = payload?.overview
  const copy = copyForUser(user)
  const planName = planLabels[user?.subscription?.plan] || 'Nolyo Pro'
  const space = user ? workspaceLabel(user) : label
  const firstName = (user?.name || 'Inès').split(' ')[0]
  const todayCount = overview?.todayAppointments?.length ?? 2
  const clients = overview?.clients ?? 18
  const income = overview?.monthIncome
  const next = (overview?.todayAppointments || []).slice(0, 2)

  return (
    <Chrome title={`Tableau de bord Nolyo — ${space}`}>
      <div className="flex min-h-0 bg-paper">
        <aside className="dash-sidebar hidden w-[13.5rem] shrink-0 flex-col p-4 text-cream sm:flex">
          <p className="font-display text-2xl tracking-tight">Nolyo</p>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-cream/50 uppercase">{planName}</p>
          <nav className="mt-6 space-y-1 text-sm" aria-hidden>
            {['Vue d’ensemble', copy.clients || 'Clients', copy.appointments || 'Rendez-vous', 'Relances'].map(
              (item, i) => (
                <p
                  key={item}
                  className={`rounded-xl px-3 py-2 ${i === 0 ? 'bg-cream font-medium text-moss' : 'text-cream/70'}`}
                >
                  {item}
                </p>
              ),
            )}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">{space}</p>
          <h3 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">Bonjour, {firstName}.</h3>
          <p className="mt-1 text-sm text-ink-soft">Vos soins, vos clients, sans bruit.</p>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[
              { label: 'Aujourd’hui', value: todayCount, hint: 'rendez-vous' },
              { label: copy.clients || 'Clients', value: clients, hint: 'au cabinet' },
              {
                label: 'Ce mois',
                value: income != null ? formatMoney(income) : '1 240 €',
                hint: 'encaissé',
                hideMobile: true,
              },
            ].map((item) => (
              <article
                key={item.label}
                className={`rounded-2xl bg-cream p-4 ring-1 ring-ink/6 ${item.hideMobile ? 'hidden lg:block' : ''}`}
              >
                <p className="text-[10px] font-semibold tracking-[0.16em] text-ink-soft uppercase">{item.label}</p>
                <p className="mt-2 font-display text-2xl tracking-tight">{item.value}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{item.hint}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-cream p-4 ring-1 ring-ink/6">
            <p className="text-sm font-medium">Maintenant</p>
            {next.length ? (
              <ul className="mt-3 space-y-2">
                {next.map((item) => (
                  <li key={item._id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{item.title || item.contact?.name || 'Rendez-vous'}</span>
                    <span className="shrink-0 text-ink-soft">
                      {item.startAt
                        ? new Date(item.startAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Massage · 15h00 — Claire Martin</p>
            )}
          </div>
        </div>
      </div>
    </Chrome>
  )
}

export function LandingPagePreview({ slug = 'maison-brume' }) {
  const [page, setPage] = useState(FALLBACK)

  useEffect(() => {
    loadPublicPage(slug)
      .then((data) => {
        if (!data) return
        setPage({
          ...FALLBACK,
          ...data,
          banner: data.banner || FALLBACK.banner,
          avatar: data.avatar || FALLBACK.avatar,
          services: data.services?.length ? data.services : FALLBACK.services,
        })
      })
      .catch(() => setPage(FALLBACK))
  }, [slug])

  const cover = mediaUrl(page.banner) || page.banner
  const portrait = mediaUrl(page.avatar) || page.avatar
  const services = (page.services || []).filter((item) => item.kind !== 'heading').slice(0, 2)

  return (
    <Chrome title={`nolyo.fr/p/${slug}`}>
      <div className="bg-[var(--page-bg,#f3eee4)]">
        <div className="relative h-36 overflow-hidden bg-moss sm:h-44">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-moss" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-paper via-transparent to-ink/40" />
        </div>

        <div className="relative px-4 pb-6 sm:px-6">
          <div className="-mt-8 flex items-end gap-4 sm:-mt-10">
            {portrait ? (
              <img
                src={portrait}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-4 ring-paper sm:h-20 sm:w-20"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-copper font-display text-2xl text-cream ring-4 ring-paper sm:h-20 sm:w-20">
                {(page.name || 'I').slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 pb-1">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">{page.name}</p>
              <p className="truncate text-sm text-ink-soft">{page.tradeLabel || 'Bien-être'}</p>
            </div>
          </div>

          <h3 className="mt-4 font-display text-xl leading-snug tracking-tight sm:text-2xl">{page.title}</h3>
          {page.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{page.description}</p>
          ) : null}

          {services.length ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {services.map((item) => (
                <li key={item._id || item.name} className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/8">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {item.durationMinutes} min
                    {item.price != null ? ` · ${formatMoney(item.price)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          <Link
            to={`/p/${slug}`}
            className="mt-5 flex w-full items-center justify-center rounded-full bg-moss py-3 text-sm font-semibold text-cream"
          >
            Réserver
          </Link>
        </div>
      </div>
    </Chrome>
  )
}
