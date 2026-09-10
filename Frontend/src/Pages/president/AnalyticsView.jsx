import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Empty, Stat, formatDay } from './shared'

function deltaLabel(delta) {
  if (delta === 0) return 'Stable vs période préc.'
  if (delta > 0) return `+${delta} % vs période préc.`
  return `${delta} % vs période préc.`
}

function pct(value) {
  if (value == null) return '—'
  return `${value} %`
}

function BarList({ items, labelKey, empty }) {
  const max = Math.max(...items.map((item) => item.count), 1)
  if (!items.length) return <Empty>{empty}</Empty>
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item[labelKey]}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item[labelKey]}</span>
            <span className="shrink-0 text-ink-soft">{item.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-moss"
              style={{ width: `${Math.max(8, Math.round((item.count / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function MiniSeries({ points, color = 'bg-moss' }) {
  const max = Math.max(...points.map((p) => p.count), 1)
  if (!points.length) {
    return <p className="text-sm text-ink-soft">Pas encore de données sur cette période.</p>
  }
  return (
    <div className="flex h-28 items-end gap-1">
      {points.map((point) => (
        <div key={point.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <div
            className={`w-full rounded-t-md ${color}`}
            style={{ height: `${Math.max(6, Math.round((point.count / max) * 100))}%` }}
            title={`${point.day} · ${point.count}`}
          />
        </div>
      ))}
    </div>
  )
}

function AnalyticsView() {
  const [range, setRange] = useState('30')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api(`/api/president/analytics?range=${range}`)
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range])

  const kpis = data?.kpis
  const rates = data?.rates

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Analyse</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Le pouls de Nolyo</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Trafic, essais, demandes, conversions, rendez-vous et membres.
            {data?.since ? ` Depuis le ${formatDay(data.since)}.` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {[
            ['7', '7 jours'],
            ['30', '30 jours'],
            ['90', '90 jours'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                range === id ? 'bg-moss text-cream' : 'bg-cream text-ink ring-1 ring-ink/10 hover:bg-paper'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {loading && !data ? <p className="text-sm text-ink-soft">Chargement de l’analyse…</p> : null}

      {kpis ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Vues du site" value={kpis.pageViews.value} hint={deltaLabel(kpis.pageViews.delta)} />
            <Stat label="Sessions" value={kpis.sessions} hint="Visiteurs approximatifs" />
            <Stat
              label="Essais 5 min"
              value={kpis.previews.value}
              hint={`${kpis.previewEssentiel} Essentiel · ${kpis.previewPro} Pro`}
              tone="dark"
            />
            <Stat
              label="Demandes"
              value={kpis.requests.value}
              hint={`${kpis.requestsEssentiel} Essentiel · ${kpis.requestsPro} Pro`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Vues /abonnement" value={kpis.subscribeViews} hint="Page demande d’abonnement" />
            <Stat label="Inscrits (période)" value={kpis.registered} hint={`${kpis.membersNew} comptes créés`} />
            <Stat label="RDV fondateur" value={kpis.founderRdv} hint="Pris sur la période" />
            <Stat label="Nouveaux avis" value={kpis.reviews} hint="Avis site approuvés" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Vue → essai</p>
              <p className="mt-2 font-display text-3xl sm:text-4xl">{pct(rates.viewToPreview)}</p>
              <p className="mt-1 text-sm text-ink-soft">Des vues qui lancent un essai</p>
            </article>
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Essai → demande</p>
              <p className="mt-2 font-display text-3xl sm:text-4xl">{pct(rates.previewToRequest)}</p>
              <p className="mt-1 text-sm text-ink-soft">Des essais qui demandent</p>
            </article>
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Demande → inscrit</p>
              <p className="mt-2 font-display text-3xl sm:text-4xl">{pct(rates.requestToRegistered)}</p>
              <p className="mt-1 text-sm text-ink-soft">Conversion commerciale</p>
            </article>
            <article className="rounded-[1.5rem] bg-moss p-5 text-cream">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-cream/55 uppercase">Délai moyen</p>
              <p className="mt-2 font-display text-3xl sm:text-4xl">
                {rates.avgDaysToRegister != null ? `${rates.avgDaysToRegister} j` : '—'}
              </p>
              <p className="mt-1 text-sm text-cream/70">
                Demande → inscription
                {rates.conversionSample ? ` · ${rates.conversionSample} dossiers` : ''}
              </p>
            </article>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Essais Essentiel vs Pro</h3>
              <p className="mt-1 text-sm text-ink-soft">Clics « Essayer 5 min » sur le site.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-paper px-4 py-4 ring-1 ring-ink/6">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Essentiel</p>
                  <p className="mt-2 font-display text-3xl sm:text-4xl">{kpis.previewEssentiel}</p>
                </div>
                <div className="rounded-2xl bg-moss px-4 py-4 text-cream">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-cream/55 uppercase">Pro</p>
                  <p className="mt-2 font-display text-3xl sm:text-4xl">{kpis.previewPro}</p>
                </div>
              </div>
            </article>

            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Tunnel des demandes</h3>
              <p className="mt-1 text-sm text-ink-soft">Sur la période · statut actuel des dossiers créés.</p>
              <dl className="mt-6 space-y-3 text-sm">
                {[
                  ['Nouvelles', data.funnel.received],
                  ['Devis envoyés', data.funnel.quote_sent],
                  ['Devis signés', data.funnel.paid],
                  ['Codes prêts', data.funnel.code_issued],
                  ['Inscrits', data.funnel.registered],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-b border-ink/6 pb-2">
                    <dt className="text-ink-soft">{label}</dt>
                    <dd className="font-display text-2xl">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Sources de trafic</h3>
              <p className="mt-1 mb-5 text-sm text-ink-soft">D’où arrivent les visiteurs (référent / UTM).</p>
              <BarList items={data.topSources} labelKey="source" empty="Pas encore de sources enregistrées." />
            </article>
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Pages vues</h3>
              <p className="mt-1 mb-5 text-sm text-ink-soft">Les chemins les plus visités.</p>
              <BarList items={data.topPaths} labelKey="path" empty="Pas encore de pages trackées." />
            </article>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6">
              <h3 className="font-display text-xl">Vues / jour</h3>
              <div className="mt-4">
                <MiniSeries points={data.series.views} />
              </div>
            </article>
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6">
              <h3 className="font-display text-xl">Essais / jour</h3>
              <div className="mt-4">
                <MiniSeries points={data.series.previews} color="bg-copper" />
              </div>
            </article>
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6">
              <h3 className="font-display text-xl">Demandes / jour</h3>
              <div className="mt-4">
                <MiniSeries points={data.series.requests} color="bg-moss-mid" />
              </div>
            </article>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Membres aujourd’hui</h3>
              <p className="mt-1 text-sm text-ink-soft">{data.members.total} comptes au total (hors démos).</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6">
                  <dt className="text-ink-soft">Essentiel</dt>
                  <dd className="mt-1 font-display text-3xl">{data.members.essentiel}</dd>
                </div>
                <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6">
                  <dt className="text-ink-soft">Pro</dt>
                  <dd className="mt-1 font-display text-3xl">{data.members.pro}</dd>
                </div>
                <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6">
                  <dt className="text-ink-soft">À jour</dt>
                  <dd className="mt-1 font-display text-3xl">{data.members.active || 0}</dd>
                </div>
                <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6">
                  <dt className="text-ink-soft">Mois offert</dt>
                  <dd className="mt-1 font-display text-3xl">{data.members.trialing || 0}</dd>
                </div>
                <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6">
                  <dt className="text-ink-soft">À régler</dt>
                  <dd className="mt-1 font-display text-3xl">
                    {(data.members.past_due || 0) + (data.members.unpaid || 0)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6">
                  <dt className="text-ink-soft">Résiliés</dt>
                  <dd className="mt-1 font-display text-3xl">{data.members.canceled || 0}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Métiers des membres</h3>
              <p className="mt-1 mb-5 text-sm text-ink-soft">Répartition selon l’onboarding.</p>
              <BarList
                items={(data.trades || []).map((item) => ({ label: item.label, count: item.count }))}
                labelKey="label"
                empty="Pas encore de métiers renseignés."
              />
            </article>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Pipeline global</h3>
              <p className="mt-1 text-sm text-ink-soft">Tous les dossiers, toutes périodes.</p>
              <dl className="mt-5 space-y-2 text-sm">
                {[
                  ['Nouvelles', data.pipelineAll.received],
                  ['Devis', data.pipelineAll.quote_sent],
                  ['Signés', data.pipelineAll.paid],
                  ['Codes', data.pipelineAll.code_issued],
                  ['Inscrits', data.pipelineAll.registered],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-ink-soft">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Rendez-vous</h3>
              <p className="mt-1 text-sm text-ink-soft">Agenda fondateur /rdv.</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-3 border-b border-ink/6 pb-2">
                  <dt className="text-ink-soft">Pris (période)</dt>
                  <dd className="font-display text-2xl">{data.founderBookings.inPeriod}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-ink/6 pb-2">
                  <dt className="text-ink-soft">Convertis</dt>
                  <dd className="font-display text-2xl">{data.founderBookings.converted}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Suite à noter</dt>
                  <dd className="font-display text-2xl">{data.founderBookings.outcomePending}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/6 sm:p-6">
              <h3 className="font-display text-2xl">Avis & suppressions</h3>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-3 border-b border-ink/6 pb-2">
                  <dt className="text-ink-soft">Avis publiés</dt>
                  <dd className="font-display text-2xl">{data.reviews.approved}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-ink/6 pb-2">
                  <dt className="text-ink-soft">Avis à modérer</dt>
                  <dd className="font-display text-2xl">{data.reviews.pending}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-ink/6 pb-2">
                  <dt className="text-ink-soft">Suppressions à traiter</dt>
                  <dd className="font-display text-2xl">{data.deletions.pending}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Comptes fermés (période)</dt>
                  <dd className="font-display text-2xl">{data.deletions.acceptedInPeriod}</dd>
                </div>
              </dl>
            </article>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default AnalyticsView
