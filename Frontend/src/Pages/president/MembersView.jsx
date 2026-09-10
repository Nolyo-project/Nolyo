import { useEffect, useMemo, useState } from 'react'
import { api, apiDownload } from '../../api/client'
import { publicSiteHref } from '../../config/site'
import { formatMoney } from '../dashboard/format'
import { Avatar, Pagination } from '../dashboard/ui'
import { Empty, Pill, formatDay, planName } from './shared'

const PAGE_SIZE = 9
const statusText = {
  active: 'À jour',
  trialing: 'Mois offert',
  past_due: 'Facture à régler',
  unpaid: 'Impayé',
  canceled: 'Résilié',
  cancelled: 'Résilié',
  none: 'Sans offre',
}

function MemberPanel({ item, onClose }) {
  const [tab, setTab] = useState('fiche')
  const [invoices, setInvoices] = useState([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const [downloadingId, setDownloadingId] = useState('')

  useEffect(() => {
    setTab('fiche')
    setInvoices([])
    setInvoiceError('')
  }, [item?.id])

  useEffect(() => {
    if (!item?.id || tab !== 'factures') return undefined
    let cancelled = false
    setLoadingInvoices(true)
    setInvoiceError('')
    api(`/api/president/members/${item.id}/invoices`)
      .then((data) => {
        if (!cancelled) setInvoices(data.invoices || [])
      })
      .catch((err) => {
        if (!cancelled) {
          setInvoices([])
          setInvoiceError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInvoices(false)
      })
    return () => {
      cancelled = true
    }
  }, [item?.id, tab])

  if (!item) return null

  async function downloadInvoice(invoice) {
    setDownloadingId(invoice.id)
    setInvoiceError('')
    try {
      await apiDownload(
        `/api/president/members/${item.id}/invoices/${invoice.id}/download`,
        invoice.fileName || 'facture.pdf',
      )
    } catch (err) {
      setInvoiceError(err.message)
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-moss/25 p-0 sm:p-3 md:p-5" onClick={onClose}>
      <article
        className="flex h-full w-full max-w-lg flex-col overflow-hidden rounded-none bg-cream shadow-2xl ring-1 ring-ink/6 sm:rounded-[1.6rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-ink/6 px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar user={item} className="h-16 w-16 text-lg" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">{planName(item.plan)}</p>
                <h2 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">{item.company || item.name}</h2>
                <p className="mt-1 text-ink-soft">{item.name}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm text-ink-soft hover:bg-paper">
              Fermer
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill tone={item.plan === 'pro' ? 'moss' : 'soft'}>{planName(item.plan)}</Pill>
            <Pill tone={item.status === 'past_due' || item.status === 'unpaid' ? 'alert' : 'paper'}>
              {statusText[item.status] || item.status || '—'}
            </Pill>
            {item.billing?.autoDebit || (item.billing?.billingChoice === 'auto' && item.billing?.hasPaymentMethod) ? (
              <Pill tone="moss">Carte · prélèvement auto</Pill>
            ) : item.billing?.billingChoice === 'invoice' ? (
              <Pill>Paiement mensuel</Pill>
            ) : item.billing?.billingChoice === 'stop' ? (
              <Pill tone="alert">Arrêt demandé</Pill>
            ) : item.billing?.hasPaymentMethod ? (
              <Pill>Carte enregistrée</Pill>
            ) : null}
            {item.published ? <Pill>Page en ligne</Pill> : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ['fiche', 'Fiche'],
              ['factures', 'Factures'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-3.5 py-1.5 text-sm ${
                  tab === id ? 'bg-moss text-cream' : 'bg-paper text-ink-soft ring-1 ring-ink/8'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
          {tab === 'fiche' ? (
            <div className="space-y-8">
              <section>
                <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Coordonnées</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
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
                  {item.slug ? (
                    <div className="sm:col-span-2">
                      <dt className="text-ink-soft">Page publique</dt>
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
              </section>

              <section>
                <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Abonnement</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-ink-soft">Formule</dt>
                    <dd>
                      {planName(item.plan)} · {statusText[item.status] || item.status || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Ouvert le</dt>
                    <dd>{formatDay(item.activatedAt || item.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Compte créé</dt>
                    <dd>{formatDay(item.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Mois offert jusqu’au</dt>
                    <dd>{formatDay(item.billing?.trialEndsAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Dernier paiement</dt>
                    <dd>{formatDay(item.billing?.paidAt)}</dd>
                  </div>
                  {item.upgradedToProAt ? (
                    <div>
                      <dt className="text-ink-soft">Passé à Pro le</dt>
                      <dd>
                        {formatDay(item.upgradedToProAt)}
                        {item.upgradeCharged ? ' · différence payée' : ''}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-ink-soft">Période en cours</dt>
                    <dd>{formatDay(item.billing?.currentPeriodEnd)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Prochaine facture</dt>
                    <dd>{formatDay(item.billing?.nextInvoiceAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Paiement</dt>
                    <dd>
                      {item.billing?.autoDebit || item.billing?.billingChoice === 'auto'
                        ? item.billing?.hasPaymentMethod
                          ? 'Prélèvement auto — carte enregistrée'
                          : 'Prélèvement auto — carte en attente'
                        : item.billing?.billingChoice === 'invoice'
                          ? 'Paiement mensuel manuel'
                          : item.billing?.billingChoice === 'stop'
                            ? 'Demande d’arrêt'
                            : item.billing?.hasPaymentMethod
                              ? 'Carte enregistrée'
                              : 'Pas encore choisi'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Stripe</dt>
                    <dd>{item.billing?.stripe ? 'Client enregistré' : 'Pas encore'}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                  Historique des formules
                </h3>
                {Array.isArray(item.planHistory) && item.planHistory.length ? (
                  <ul className="mt-3 space-y-3">
                    {item.planHistory.map((entry, index) => (
                      <li
                        key={`${entry.plan}-${entry.from || index}`}
                        className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6"
                      >
                        <p className="font-medium">{planName(entry.plan)}</p>
                        <p className="mt-1 text-sm text-ink-soft">
                          Du {formatDay(entry.from)}
                          {entry.to ? ` au ${formatDay(entry.to)}` : ' → en cours'}
                          {entry.note === 'upgrade_essai'
                            ? ' · pendant le mois offert'
                            : entry.note === 'upgrade_paye'
                              ? ' · différence payée'
                              : entry.note === 'upgrade_prochaine_facture'
                                ? ' · prochain mois au tarif Pro'
                                : entry.note === 'inscription'
                                  ? ' · à l’inscription'
                                  : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-ink-soft">
                    {planName(item.plan)} depuis {formatDay(item.activatedAt || item.createdAt)}
                    {item.upgradedToProAt ? ` · Pro depuis ${formatDay(item.upgradedToProAt)}` : ''}
                  </p>
                )}
              </section>
            </div>
          ) : (
            <section>
              <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Factures Stripe</h3>
              <p className="mt-1 text-sm text-ink-soft">Téléchargez-les au format Prénom Nom - mois année.</p>
              {invoiceError ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{invoiceError}</p> : null}
              {loadingInvoices ? (
                <p className="mt-4 text-sm text-ink-soft">Chargement des factures…</p>
              ) : invoices.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-ink/12 px-4 py-6 text-sm text-ink-soft">
                  Aucune facture Stripe pour ce client.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {invoices.map((invoice) => (
                    <li
                      key={invoice.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{invoice.label}</p>
                        <p className="text-xs text-ink-soft">
                          {formatMoney(invoice.amount)} · {invoice.status === 'paid' ? 'Payée' : invoice.status}
                          {invoice.paidAt || invoice.createdAt ? ` · ${formatDay(invoice.paidAt || invoice.createdAt)}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!invoice.hasPdf || downloadingId === invoice.id}
                        onClick={() => downloadInvoice(invoice)}
                        className="shrink-0 rounded-full bg-moss px-3.5 py-1.5 text-sm font-semibold text-cream disabled:opacity-50"
                      >
                        {downloadingId === invoice.id ? '…' : 'Télécharger'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
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
                  <Pill tone={item.status === 'past_due' || item.status === 'unpaid' ? 'alert' : 'paper'}>
                    {statusText[item.status] || item.status || '—'}
                  </Pill>
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

      <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />

      <MemberPanel item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

export default MembersView
