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

  useEffect(() => {
    if (!isProPlan(user)) return
    api('/api/workspace/stats')
      .then((res) => setData(res.stats))
      .catch((err) => setError(err.message))
  }, [user])

  if (!isProPlan(user)) {
    return (
      <UpgradeWall
        title="Statistiques"
        icon="chart"
        description="Suivez votre chiffre d’affaires mois par mois, vos missions terminées et le rythme de votre carnet."
        highlights={[
          'Évolution du chiffre d’affaires sur six mois',
          'Missions terminées et rythme du carnet',
          'Résultat après dépenses, en un coup d’œil',
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

  const maxIncome = Math.max(...data.months.map((item) => item.income), 1)

  return (
    <PageShell>
      <PageHeader
        kicker="Pro"
        title="Statistiques"
        description="Une lecture plus fine de votre activité, réservée à Nolio Pro."
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ce mois', value: formatMoney(data.monthIncome), hint: 'encaissé' },
          { label: 'Résultat', value: formatMoney(data.monthBalance), hint: 'après dépenses' },
          { label: 'Missions finies', value: data.doneClients, hint: 'dans le carnet' },
          { label: 'Prospects', value: data.prospects, hint: 'en cours' },
        ].map((item) => (
          <Surface key={item.label} className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">{item.label}</p>
            <p className="mt-3 font-display text-3xl tracking-tight">{item.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{item.hint}</p>
          </Surface>
        ))}
      </section>

      <Surface className="mt-8 p-6">
        <h2 className="font-display text-2xl">Six derniers mois</h2>
        <p className="mt-1 text-sm text-ink-soft">Le chiffre d’affaires encaissé, mois par mois.</p>
        {data.months.every((item) => item.income === 0) ? (
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
      </Surface>
    </PageShell>
  )
}

export default Stats
