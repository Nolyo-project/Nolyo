import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { Empty, Pill, PipelineBar, formatDate, planName, pipeline, statusHint, statusLabels } from './shared'

function RequestDetail({ item, quoteNote, setQuoteNote, issueNote, setIssueNote, pending, copied, onCopy, onRun, onFlag, onClear }) {
  if (!item) {
    return <Empty>Choisissez une personne pour voir sa fiche.</Empty>
  }

  return (
    <article className="flex h-full min-h-0 flex-col overflow-y-auto rounded-3xl bg-cream p-6 ring-1 ring-ink/6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">{statusLabels[item.status]}</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">{item.company}</h2>
          <p className="mt-1 text-ink-soft">
            {item.name} ·{' '}
            <a className="underline decoration-copper/40" href={`mailto:${item.email}`}>
              {item.email}
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={item.plan === 'pro' ? 'moss' : 'soft'}>{planName(item.plan)}</Pill>
          {item.issueNote ? <Pill tone="alert">Problème</Pill> : null}
        </div>
      </div>

      <div className="mt-5">
        <PipelineBar status={item.status} />
      </div>
      <p className="mt-3 text-sm text-ink-soft">{statusHint[item.status]}</p>

      {item.message ? <p className="mt-5 rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">{item.message}</p> : null}

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-soft">Abonnement</dt>
          <dd>{planName(item.plan)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Équipe</dt>
          <dd>{item.teamSize || '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Demande reçue</dt>
          <dd>{formatDate(item.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Devis envoyé</dt>
          <dd>{formatDate(item.quoteSentAt)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Paiement</dt>
          <dd>{formatDate(item.paidAt)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Code créé</dt>
          <dd>{formatDate(item.inviteCodeCreatedAt)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Inscription</dt>
          <dd>{formatDate(item.registeredAt)}</dd>
        </div>
        {item.quoteNote ? (
          <div className="sm:col-span-2">
            <dt className="text-ink-soft">Note interne</dt>
            <dd>{item.quoteNote}</dd>
          </div>
        ) : null}
      </dl>

      {item.inviteCode ? (
        <div className="mt-5 rounded-[1.2rem] bg-moss p-4 text-cream">
          <p className="text-[11px] tracking-[0.18em] text-cream/50 uppercase">Code unique</p>
          <p className="mt-1 font-mono text-xl tracking-wide">{item.inviteCode}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => onCopy(item.inviteCode)} className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink">
              {copied ? 'Copié' : 'Copier'}
            </button>
            <a
              href={`mailto:${item.email}?subject=${encodeURIComponent('Votre code Nolyo')}&body=${encodeURIComponent(
                `Bonjour ${item.name.split(' ')[0]},\n\nVoici votre code pour ouvrir Nolyo : ${item.inviteCode}\nInscrivez-vous ensuite sur nolyo.fr/inscription\n\nLe premier mois est offert.`,
              )}`}
              className="rounded-full border border-cream/25 px-4 py-2 text-sm font-semibold text-cream"
            >
              Envoyer par e-mail
            </a>
          </div>
        </div>
      ) : null}

      {item.issueNote ? (
        <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Problème noté le {formatDate(item.issueAt)}</p>
          <p className="mt-1">{item.issueNote}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`mailto:${item.email}?subject=${encodeURIComponent('Nolyo — un point à régler')}&body=${encodeURIComponent(
                `Bonjour ${item.name.split(' ')[0]},\n\n${item.issueNote}\n\nFlorentin, Nolyo`,
              )}`}
              className="text-sm font-medium underline"
            >
              Prévenir par e-mail
            </a>
            <button type="button" className="text-sm underline" onClick={() => onClear(item.id)}>
              Marquer comme réglé
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <label className="block text-sm font-medium">
            Signaler un problème
            <input
              className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-paper px-4 py-2.5 text-sm outline-none focus:border-copper"
              value={issueNote}
              onChange={(event) => setIssueNote(event.target.value)}
              placeholder="Paiement incomplet, e-mail erroné…"
            />
          </label>
          <button
            type="button"
            disabled={pending || issueNote.trim().length < 2}
            onClick={() => onFlag(item.id)}
            className="mt-2 rounded-full border border-ink/10 px-4 py-2 text-sm disabled:opacity-60"
          >
            Enregistrer l’alerte
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {item.status === 'received' ? (
          <>
            <input
              className="min-w-48 flex-1 rounded-2xl border border-ink/10 bg-paper px-4 py-2.5 text-sm outline-none focus:border-copper"
              value={quoteNote}
              onChange={(event) => setQuoteNote(event.target.value)}
              placeholder="Note interne, optionnelle"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => onRun(item.id, 'send-quote')}
              className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
            >
              Devis envoyé
            </button>
          </>
        ) : null}
        {item.status === 'quote_sent' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onRun(item.id, 'confirm-payment')}
            className="rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
          >
            Paiement reçu
          </button>
        ) : null}
        {item.status === 'paid' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onRun(item.id, 'issue-code')}
            className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
          >
            Générer le code
          </button>
        ) : null}
      </div>
    </article>
  )
}

function RequestsView({
  requests,
  counts,
  selectedId,
  setSelectedId,
  quoteNote,
  setQuoteNote,
  pending,
  copied,
  onCopy,
  onRun,
  onUpdate,
  q,
}) {
  const [tab, setTab] = useState('received')
  const [issueNote, setIssueNote] = useState('')
  const [localError, setLocalError] = useState('')

  const selected = useMemo(
    () => requests.find((item) => item.id === selectedId) || null,
    [requests, selectedId],
  )

  useEffect(() => {
    if (selected?.status) setTab(selected.status)
  }, [selectedId, selected?.status])

  const visible = useMemo(() => {
    return requests.filter((item) => {
      if (item.status !== tab) return false
      if (!q) return true
      return (
        String(item.company || '').toLowerCase().includes(q) ||
        String(item.name || '').toLowerCase().includes(q) ||
        String(item.email || '').toLowerCase().includes(q) ||
        String(item.inviteCode || '').toLowerCase().includes(q)
      )
    })
  }, [requests, tab, q])

  async function flagIssue(id) {
    setLocalError('')
    try {
      const data = await api(`/api/president/requests/${id}/flag-issue`, { method: 'POST', body: { note: issueNote } })
      onUpdate?.(data.request)
      setIssueNote('')
    } catch (err) {
      setLocalError(err.message)
    }
  }

  async function clearIssue(id) {
    setLocalError('')
    try {
      const data = await api(`/api/president/requests/${id}/clear-issue`, { method: 'POST' })
      onUpdate?.(data.request)
    } catch (err) {
      setLocalError(err.message)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap gap-2">
        {pipeline.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              const first = requests.find((item) => item.status === id)
              setSelectedId(first?.id || null)
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm ${tab === id ? 'bg-moss text-cream' : 'bg-cream ring-1 ring-ink/8'}`}
          >
            {label} · {counts[id] || 0}
          </button>
        ))}
      </div>

      <section className="mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <ul className="min-h-0 space-y-2 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <li>
              <Empty>{q ? 'Aucun résultat.' : 'Personne à cette étape.'}</Empty>
            </li>
          ) : (
            visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl px-4 py-3 text-left ring-1 ${
                    selectedId === item.id ? 'bg-moss text-cream ring-moss' : 'bg-cream ring-ink/6 hover:bg-paper-2'
                  }`}
                >
                  <p className="font-medium">{item.company}</p>
                  <p className={`text-xs ${selectedId === item.id ? 'text-cream/70' : 'text-ink-soft'}`}>
                    {item.name}
                    {item.issueNote ? ' · alerte' : ''}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="min-h-0">
          {localError ? <p className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{localError}</p> : null}
          <RequestDetail
          item={selected && selected.status === tab ? selected : visible[0] || null}
          quoteNote={quoteNote}
          setQuoteNote={setQuoteNote}
          issueNote={issueNote}
          setIssueNote={setIssueNote}
          pending={pending}
          copied={copied}
          onCopy={onCopy}
          onRun={onRun}
          onFlag={flagIssue}
          onClear={clearIssue}
        />
        </div>
      </section>
    </div>
  )
}

export default RequestsView
