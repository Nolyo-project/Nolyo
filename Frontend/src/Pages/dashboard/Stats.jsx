import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { formatMoney } from './format'
import { UpgradeWall } from './UpgradeWall'
import { EmptyState, PageHeader, PageShell, Surface } from './ui'

function Stats() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [monthsOffset, setMonthsOffset] = useState(0)

  useEffect(() => {
    if (!isProPlan(user)) return
    api(`/api/workspace/stats?monthsOffset=${monthsOffset}`)
      .then((res) => setData(res.stats))
      .catch((err) => setError(err.message))
  }, [user, monthsOffset])

  if (!isProPlan(user)) {
    return (
      <UpgradeWall
        title="Statistiques"
        icon="chart"
        description="Voyez ce qui avance vraiment : devis, signatures, impayés et chiffre d’affaires."
        highlights={[
          'Devis à envoyer, envoyés et signés',
          'Argent encore dû, client par client',
          'Évolution du chiffre d’affaires sur six mois',
        ]}
      />
    )
  }

  if (error) {
    return <p className="m-8 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
  }

  if (!data) {
    return <p className="px-5 py-16 text-center text-ink-soft lg:px-10">Chargement des statistiques…</p>
  }

  const maxIncome = Math.max(...(data.months || []).map((item) => item.income), 1)
  const change = data.incomeChange
  const changeLabel =
    change == null ? 'Pas encore de comparaison' : change === 0 ? 'Identique au mois dernier' : `${change > 0 ? '+' : ''}${change} % vs mois dernier`
  const firstMonth = data.months?.[0]?.label || ''
  const lastMonth = data.months?.[data.months.length - 1]?.label || ''
  const periodLabel = firstMonth && lastMonth ? `${firstMonth} – ${lastMonth}` : 'Six mois'

  return (
    <PageShell>
      <PageHeader
        kicker="Pro"
        title="Statistiques"
        description="L’essentiel pour piloter l’activité : ce qui rentre, ce qui attend, et où ça bloque."
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Encaissé ce mois', value: formatMoney(data.monthIncome), hint: changeLabel },
          { label: 'Encore dû', value: formatMoney(data.unpaidAmount), hint: 'acomptes et soldes ouverts' },
          { label: 'Conversion', value: `${data.conversion || 0} %`, hint: 'prospects devenus clients' },
          { label: 'Panier moyen', value: formatMoney(data.avgDeal), hint: 'montant des missions' },
        ].map((item) => (
          <Surface key={item.label} className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">{item.label}</p>
            <p className="mt-3 font-display text-3xl tracking-tight">{item.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{item.hint}</p>
          </Surface>
        ))}
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Devis à envoyer', value: data.quotesWaiting || 0, to: '/dashboard/clients' },
          { label: 'Devis envoyés', value: data.quotesSent || 0, to: '/dashboard/clients' },
          { label: 'Devis signés', value: data.quotesSigned || 0, to: '/dashboard/clients' },
        ].map((item) => (
          <Surface as={Link} to={item.to} key={item.label} className="block p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">{item.label}</p>
            <p className="mt-3 font-display text-3xl tracking-tight">{item.value}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {data.openClients || 0} mission{(data.openClients || 0) > 1 ? 's' : ''} en cours
            </p>
          </Surface>
        ))}
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Surface className="p-6">
          <h2 className="font-display text-2xl">À encaisser</h2>
          <p className="mt-1 text-sm text-ink-soft">Les dossiers qui attendent un paiement, pour ne plus les suivre ailleurs.</p>
          {(data.waitingMoney || []).length === 0 ? (
            <div className="mt-6">
              <EmptyState>Rien en attente. Les acomptes non payés apparaîtront ici.</EmptyState>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {data.waitingMoney.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-sm text-ink-soft">{item.label}</p>
                  </div>
                  <p className="shrink-0 font-display text-lg">{formatMoney(item.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-2xl">Six mois</h2>
              <p className="mt-1 text-sm capitalize text-ink-soft">{periodLabel}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={monthsOffset <= -60}
                onClick={() => setMonthsOffset((current) => current - 6)}
                className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink ring-1 ring-ink/8 transition hover:bg-paper disabled:opacity-40"
                aria-label="Six mois précédents"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={monthsOffset >= 24}
                onClick={() => setMonthsOffset((current) => current + 6)}
                className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink ring-1 ring-ink/8 transition hover:bg-paper disabled:opacity-40"
                aria-label="Six mois suivants"
              >
                ›
              </button>
            </div>
          </div>
          {(data.months || []).every((item) => item.income === 0) ? (
            <div className="mt-6">
              <EmptyState>Aucun encaissement sur cette période.</EmptyState>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {data.months.map((item) => (
                <li key={item.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="capitalize">{item.label}</span>
                    <span className="font-medium">{formatMoney(item.income)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-paper">
                    <div
                      className="h-2 rounded-full bg-moss"
                      style={{ width: item.income ? `${Math.max(8, Math.round((item.income / maxIncome) * 100))}%` : '0%' }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {monthsOffset !== 0 ? (
            <button type="button" className="mt-5 text-sm underline" onClick={() => setMonthsOffset(0)}>
              Revenir aux six derniers mois
            </button>
          ) : null}
        </Surface>
      </div>

      <section className="mt-8">
        <Surface className="p-6 sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-copper uppercase">Nolyo m’a rapporté</p>
          <h2 className="mt-2 font-display text-2xl">Une lecture indicative</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
            Ce que les réservations en ligne ont réellement enregistré. Ce n’est pas une garantie de résultat, seulement
            le suivi des rendez-vous pris via votre page Nolyo.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-paper px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Réservations</p>
              <p className="mt-2 font-display text-3xl tracking-tight">{data.nolio?.bookings || 0}</p>
            </div>
            <div className="rounded-2xl bg-paper px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Nouveaux clients</p>
              <p className="mt-2 font-display text-3xl tracking-tight">{data.nolio?.newContacts || 0}</p>
            </div>
            <div className="rounded-2xl bg-paper px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Montant réservé</p>
              <p className="mt-2 font-display text-3xl tracking-tight">{formatMoney(data.nolio?.bookedAmount || 0)}</p>
            </div>
            <div className="rounded-2xl bg-paper px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Encaissé lié</p>
              <p className="mt-2 font-display text-3xl tracking-tight">{formatMoney(data.nolio?.collectedAmount || 0)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            Le montant réservé additionne les prix des prestations confirmées (hors annulations). L’encaissé lié ne
            compte que les paiements déjà saisis sur ces fiches, pas une estimation.
          </p>
        </Surface>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Missions ouvertes</p>
          <p className="mt-3 font-display text-3xl tracking-tight">{data.openClients || 0}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Missions terminées</p>
          <p className="mt-3 font-display text-3xl tracking-tight">{data.doneClients || 0}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Prospects</p>
          <p className="mt-3 font-display text-3xl tracking-tight">{data.prospects || 0}</p>
        </Surface>
      </section>
    </PageShell>
  )
}

export default Stats
