import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { planLabels } from '../data/plans'
import Logo from '../components/Logo'

const statusLabels = {
  received: 'Nouvelle demande',
  quote_sent: 'Devis envoyé',
  paid: 'Signé + payé',
  code_issued: 'Code à transmettre',
  registered: 'Inscrit',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PresidentDashboard() {
  const { user, logout } = useAuth()
  const [requests, setRequests] = useState([])
  const [counts, setCounts] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [quoteNote, setQuoteNote] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const selected = useMemo(
    () => requests.find((item) => item.id === selectedId) || requests[0] || null,
    [requests, selectedId],
  )

  async function load() {
    const data = await api('/api/president/requests')
    setCounts(data.counts || {})
    setRequests(data.requests || [])
    setSelectedId((current) => current || data.requests?.[0]?.id || null)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function run(action) {
    if (!selected) return
    setError('')
    setPending(true)
    try {
      const data = await api(`/api/president/requests/${selected.id}/${action}`, {
        method: 'POST',
        body: action === 'send-quote' ? { quoteNote } : undefined,
      })
      setRequests((current) =>
        current.map((item) => (item.id === data.request.id ? data.request : item)),
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

  async function copyCode() {
    if (!selected?.inviteCode) return
    await navigator.clipboard.writeText(selected.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="min-h-svh bg-paper text-ink lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="hidden flex-col bg-moss text-cream lg:flex">
        <div className="px-6 py-6">
          <Logo to="/president" inverted />
          <p className="mt-3 text-xs tracking-[0.18em] text-cream/45 uppercase">Bureau du président</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <span className="rounded-xl bg-cream/10 px-3 py-2.5 text-sm font-medium">Demandes</span>
          <Link to="/" className="rounded-xl px-3 py-2.5 text-sm text-cream/70 hover:bg-cream/5">
            Site public
          </Link>
        </nav>
        <div className="border-t border-cream/10 px-6 py-5">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-cream/55">{user.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-4 text-sm text-cream/70 underline decoration-cream/30 hover:text-cream"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <div>
        <header className="flex items-center justify-between border-b border-ink/8 px-5 py-4 lg:px-10">
          <div>
            <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Dashboard président</p>
            <h1 className="font-display text-2xl sm:text-3xl">Demandes d’abonnement</h1>
          </div>
          <button
            type="button"
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menu
          </button>
        </header>

        {menuOpen ? (
          <div className="border-b border-ink/8 bg-cream px-5 py-4 lg:hidden">
            <Link to="/" className="mr-4 text-sm underline">
              Site public
            </Link>
            <button type="button" onClick={logout} className="text-sm underline">
              Déconnexion
            </button>
          </div>
        ) : null}

        <main className="px-5 py-8 lg:px-10">
          <section className="grid gap-3 sm:grid-cols-5">
            {[
              ['received', 'Nouvelles'],
              ['quote_sent', 'Devis envoyés'],
              ['paid', 'Payés'],
              ['code_issued', 'Codes'],
              ['registered', 'Inscrits'],
            ].map(([key, label]) => (
              <article key={key} className="rounded-[1.3rem] bg-cream p-4">
                <p className="text-xs tracking-wide text-ink-soft uppercase">{label}</p>
                <p className="mt-1 font-display text-3xl">{counts[key] || 0}</p>
              </article>
            ))}
          </section>

          {error ? (
            <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}

          {requests.length === 0 ? (
            <p className="mt-10 rounded-[1.6rem] border border-dashed border-ink/15 px-6 py-16 text-center text-ink-soft">
              Aucune demande pour le moment.
            </p>
          ) : (
            <section className="mt-8 grid gap-6 lg:grid-cols-[19rem_1fr]">
              <ul className="space-y-2">
                {requests.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-2xl px-4 py-3 text-left ${
                        selected?.id === item.id ? 'bg-moss text-cream' : 'bg-cream hover:bg-paper-2'
                      }`}
                    >
                      <p className="font-medium">{item.company}</p>
                      <p className={`text-xs ${selected?.id === item.id ? 'text-cream/70' : 'text-ink-soft'}`}>
                        {item.name} · {statusLabels[item.status]}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>

              {selected ? (
                <article className="rounded-[1.7rem] border border-ink/8 bg-cream p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] text-copper uppercase">
                        {statusLabels[selected.status]}
                      </p>
                      <h2 className="mt-1 font-display text-3xl">{selected.company}</h2>
                      <p className="mt-1 text-ink-soft">
                        {selected.name} · {selected.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-paper px-3 py-1 text-sm">
                      {planLabels[selected.plan]}
                    </span>
                  </div>

                  {selected.message ? (
                    <p className="mt-6 rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">
                      {selected.message}
                    </p>
                  ) : null}

                  <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-ink-soft">Demande reçue</dt>
                      <dd>{formatDate(selected.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-soft">Devis envoyé</dt>
                      <dd>{formatDate(selected.quoteSentAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-soft">Signé + paiement</dt>
                      <dd>{formatDate(selected.paidAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-soft">Inscription</dt>
                      <dd>{formatDate(selected.registeredAt)}</dd>
                    </div>
                  </dl>

                  {selected.quoteNote ? (
                    <p className="mt-4 text-sm">
                      Note devis : <span className="text-ink-soft">{selected.quoteNote}</span>
                    </p>
                  ) : null}

                  {selected.inviteCode ? (
                    <div className="mt-6 rounded-[1.3rem] bg-moss p-5 text-cream">
                      <p className="text-xs tracking-[0.18em] text-cream/50 uppercase">Code unique</p>
                      <p className="mt-2 font-mono text-2xl tracking-wide">{selected.inviteCode}</p>
                      <p className="mt-2 text-sm text-cream/70">
                        Transmettez ce code au client pour qu’il s’inscrive sur /inscription.
                      </p>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="mt-4 rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink"
                      >
                        {copied ? 'Copié' : 'Copier le code'}
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-8 space-y-3">
                    {selected.status === 'received' ? (
                      <>
                        <label className="block text-sm font-medium">
                          Note interne (n° de devis, montant…)
                          <input
                            className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-sm outline-none focus:border-copper"
                            value={quoteNote}
                            onChange={(event) => setQuoteNote(event.target.value)}
                            placeholder="Devis 2026-014 · Nolio Pro 9,99€ / mois"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run('send-quote')}
                          className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
                        >
                          Marquer le devis comme envoyé
                        </button>
                      </>
                    ) : null}

                    {selected.status === 'quote_sent' ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run('confirm-payment')}
                        className="rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
                      >
                        Devis signé et paiement reçus
                      </button>
                    ) : null}

                    {selected.status === 'paid' ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run('issue-code')}
                        className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
                      >
                        Générer le code unique
                      </button>
                    ) : null}
                  </div>
                </article>
              ) : null}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default PresidentDashboard
