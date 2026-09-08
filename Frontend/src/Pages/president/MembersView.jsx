import { useEffect, useMemo, useState } from 'react'
import { publicSiteHref } from '../../config/site'
import { Avatar } from '../dashboard/ui'
import { Empty, Pill, formatDay, planName } from './shared'

const PAGE_SIZE = 9
const statusText = { active: 'Actif', none: 'Sans offre', canceled: 'Résilié', cancelled: 'Résilié' }

function MemberPanel({ item, onClose }) {
  if (!item) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-moss/25 p-3 sm:p-5" onClick={onClose}>
      <article
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto rounded-[1.6rem] bg-cream p-6 shadow-2xl ring-1 ring-ink/6 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar user={item} className="h-16 w-16 text-lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">{planName(item.plan)}</p>
              <h2 className="mt-1 font-display text-3xl tracking-tight">{item.company || item.name}</h2>
              <p className="mt-1 text-ink-soft">{item.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm text-ink-soft hover:bg-paper">
            Fermer
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Pill tone={item.plan === 'pro' ? 'moss' : 'soft'}>{planName(item.plan)}</Pill>
          <Pill>{statusText[item.status] || item.status || '—'}</Pill>
          {item.published ? <Pill>Page en ligne</Pill> : null}
        </div>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-ink-soft">E-mail</dt>
            <dd>
              <a className="underline decoration-copper/40" href={`mailto:${item.email}`}>
                {item.email}
              </a>
            </dd>
          </div>
          {item.phone ? (
            <div>
              <dt className="text-ink-soft">Téléphone</dt>
              <dd>
                <a href={`tel:${item.phone.replace(/\s/g, '')}`}>{item.phone}</a>
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-soft">Ville</dt>
            <dd>{item.city || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Métier</dt>
            <dd>{item.trade || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Abonnement</dt>
            <dd>
              {planName(item.plan)} · {statusText[item.status] || item.status || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Ouvert le</dt>
            <dd>{formatDay(item.activatedAt || item.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Compte créé le</dt>
            <dd>{formatDay(item.createdAt)}</dd>
          </div>
          {item.slug ? (
            <div className="sm:col-span-2">
              <dt className="text-ink-soft">Page</dt>
              <dd>
                <a
                  href={publicSiteHref(`/p/${item.slug}`)}
                  className="underline decoration-copper/40"
                  target="_blank"
                  rel="noreferrer"
                >
                  /p/{item.slug}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </article>
    </div>
  )
}

function MembersView({ members, memberCounts, q, planFilter, setPlanFilter, focusId, onFocusConsumed }) {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    const list = members.filter((item) => {
      if (planFilter !== 'all' && item.plan !== planFilter) return false
      return (
        String(item.company || '').toLowerCase().includes(q) ||
        String(item.name || '').toLowerCase().includes(q) ||
        String(item.email || '').toLowerCase().includes(q) ||
        String(item.slug || '').toLowerCase().includes(q) ||
        String(item.city || '').toLowerCase().includes(q)
      )
    })
    return list.sort((a, b) =>
      String(a.company || a.name || '').localeCompare(String(b.company || b.name || ''), 'fr', { sensitivity: 'base' }),
    )
  }, [members, q, planFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [q, planFilter])

  useEffect(() => {
    if (!focusId) return
    const item = members.find((member) => String(member.id) === String(focusId))
    if (item) setSelected(item)
    onFocusConsumed?.()
  }, [focusId, members, onFocusConsumed])

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[
          ['all', `Tous · ${members.length}`],
          ['pro', `Pro · ${memberCounts.pro || 0}`],
          ['essentiel', `Essentiel · ${memberCounts.essentiel || 0}`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPlanFilter(id)}
            className={`rounded-full px-3 py-1.5 text-sm ${planFilter === id ? 'bg-moss text-cream' : 'bg-cream ring-1 ring-ink/8'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-8">
          <Empty>{q ? 'Aucun résultat.' : 'Aucun membre pour le moment.'}</Empty>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="flex h-full w-full flex-col rounded-[1.4rem] bg-cream p-5 text-left ring-1 ring-ink/6 transition hover:-translate-y-0.5 hover:ring-copper/30"
              >
                <div className="flex items-start gap-3">
                  <Avatar user={item} className="h-12 w-12" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.company || item.name}</p>
                    <p className="truncate text-sm text-ink-soft">{item.name}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone={item.plan === 'pro' ? 'moss' : 'soft'}>{planName(item.plan)}</Pill>
                  {item.published ? <Pill>Page</Pill> : null}
                </div>
                <p className="mt-auto pt-4 text-xs text-ink-soft">
                  {item.city ? `${item.city} · ` : ''}
                  Ouvert le {formatDay(item.activatedAt || item.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-full border border-ink/10 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Précédent
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`h-9 w-9 rounded-full text-sm ${n === safePage ? 'bg-moss text-cream' : 'bg-cream text-ink-soft'}`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={safePage >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            className="rounded-full border border-ink/10 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Suivant
          </button>
        </nav>
      ) : null}

      <MemberPanel item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

export default MembersView
