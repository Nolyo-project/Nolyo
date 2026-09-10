import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { copyForUser } from '../../data/trades'
import { PAYMENT_METHODS, paymentMethodLabel } from '../../data/payments'
import { fieldClass, formatDateTime, formatMoney } from './format'
import { Modal, primaryBtn, quietBtn } from './ui'

const LATER_KEY = 'nolio_followup_later'

function laterIds() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(LATER_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function rememberLater(id) {
  const next = [...new Set([...laterIds(), id])]
  sessionStorage.setItem(LATER_KEY, JSON.stringify(next))
}

function FollowUpModal() {
  const { user } = useAuth()
  const copy = copyForUser(user)
  const [queue, setQueue] = useState([])
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const current = queue[0] || null
  const contact = current?.contact
  const askPayment = Boolean(current?.askPayment)
  const sessionWord = copy.appointmentHint || 'rendez-vous'

  async function load() {
    const data = await api('/api/workspace/follow-ups')
    const skipped = new Set(laterIds())
    setQueue((data.appointments || []).filter((item) => !skipped.has(item._id)))
  }

  useEffect(() => {
    load().catch(() => {})
    const timer = window.setInterval(() => {
      load().catch(() => {})
    }, 20000)
    function onVisible() {
      if (document.visibilityState === 'visible') load().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!current) return
    setNote('')
    setError('')
    setMethod('')
    setAmount(current.amount > 0 ? String(current.amount) : '')
  }, [current?._id])

  async function submit(action) {
    if (!current) return
    setError('')
    if (action === 'note' && note.trim().length < 2) {
      setError('Écrivez ce qu’il faut retenir de ce rendez-vous.')
      return
    }
    if (action === 'paid' && !method) {
      setError('Choisissez le moyen de paiement.')
      return
    }
    setPending(true)
    try {
      await api(`/api/workspace/appointments/${current._id}/follow-up`, {
        method: 'POST',
        body: {
          action,
          note: note.trim(),
          amount: amount === '' ? undefined : Number(amount),
          method,
        },
      })
      setQueue((items) => items.filter((item) => item._id !== current._id))
      setNote('')
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  function postpone() {
    if (!current) return
    rememberLater(current._id)
    setQueue((items) => items.filter((item) => item._id !== current._id))
    setNote('')
    setError('')
  }

  if (!current || !contact) return null

  const methodLabel = paymentMethodLabel(method)
  const paidLabel =
    Number(amount) > 0
      ? `Séance payée · ${formatMoney(Number(amount))}${methodLabel ? ` · ${methodLabel}` : ''}`
      : methodLabel
        ? `Séance payée · ${methodLabel}`
        : 'Séance payée'

  return (
    <Modal onClose={postpone} panelClassName="max-w-md" overlayClassName="z-[60]">
      <div>
        <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">C’est l’heure</p>
        <h2 className="mt-1 font-display text-2xl wrap-break-word sm:text-3xl">{contact.name}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {current.serviceName || current.title ? `${current.serviceName || current.title} · ` : ''}
          {formatDateTime(current.startAt)}
          {current.source === 'booking' ? ' · page pro' : ''}
        </p>

        {askPayment ? (
          <>
            <p className="mt-3 text-sm text-ink-soft">
              Enregistrez le paiement de cette {sessionWord} : le moyen et le montant restent dans le suivi client.
            </p>
            <label className="mt-5 block text-sm font-medium">
              Montant (€)
              <input
                className={fieldClass}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
              />
            </label>
            <p className="mt-4 text-sm font-medium">Moyen de paiement</p>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((item) => {
                const selected = method === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setMethod(item.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                        selected
                          ? 'border-copper bg-cream shadow-sm ring-1 ring-copper/30'
                          : 'border-ink/10 bg-cream/60 hover:border-copper/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
            <label className="mt-4 block text-sm font-medium">
              Note <span className="font-normal text-ink-soft">(facultatif)</span>
              <textarea
                className={`${fieldClass} min-h-24 resize-y`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Allergie, prochaine fois, ce qu’il faut retenir…"
              />
            </label>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-soft">
              {current.kind === 'quote'
                ? 'Cet échange servait à cadrer un devis. Notez ce qu’il faut retenir : la note reste sur la fiche, puis vous pourrez envoyer le devis.'
                : `Notez ce rendez-vous : la note reste sur ${contact.kind === 'prospect' ? 'ce prospect' : 'ce client'}, même s’il change de statut.`}
            </p>
            <label className="mt-5 block text-sm font-medium">
              Notes du rendez-vous
              <textarea
                className={`${fieldClass} min-h-32 resize-y`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ce qu’il faut retenir de cet échange…"
                autoFocus
              />
            </label>
          </>
        )}

        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-2">
          {askPayment ? (
            <>
              <button
                type="button"
                disabled={pending || !method}
                onClick={() => submit('paid')}
                className={primaryBtn}
              >
                {pending ? 'Enregistrement…' : paidLabel}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit('absent')}
                className="inline-flex items-center justify-center rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-copper-dark disabled:opacity-60"
              >
                Absent
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={pending} onClick={() => submit('note')} className={primaryBtn}>
                {pending ? 'Enregistrement…' : 'Enregistrer les notes'}
              </button>
              {contact.kind === 'prospect' ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => submit('client')}
                  className="inline-flex items-center justify-center rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-moss/90 disabled:opacity-60"
                >
                  Enregistrer et passer en client
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => submit('archive')}
                className="inline-flex items-center justify-center rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-copper-dark disabled:opacity-60"
              >
                Sans suite
              </button>
            </>
          )}
        </div>
        <div className="mt-4">
          <button type="button" className={quietBtn} onClick={postpone}>
            Plus tard
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default FollowUpModal
