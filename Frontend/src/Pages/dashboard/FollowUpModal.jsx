import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { fieldClass, formatDateTime } from './format'
import { primaryBtn, quietBtn } from './ui'

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
  const [queue, setQueue] = useState([])
  const [note, setNote] = useState('')
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const current = queue[0] || null
  const contact = current?.contact

  async function load() {
    const data = await api('/api/workspace/follow-ups')
    const skipped = new Set(laterIds())
    setQueue((data.appointments || []).filter((item) => !skipped.has(item._id)))
  }

  useEffect(() => {
    load().catch(() => {})
    const timer = window.setInterval(() => {
      load().catch(() => {})
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  async function submit(action) {
    if (!current) return
    setError('')
    if (action === 'note' && note.trim().length < 2) {
      setError('Écrivez ce qu’il faut retenir.')
      setWriting(true)
      return
    }
    setPending(true)
    try {
      await api(`/api/workspace/appointments/${current._id}/follow-up`, {
        method: 'POST',
        body: { action, note: note.trim() },
      })
      setQueue((items) => items.filter((item) => item._id !== current._id))
      setNote('')
      setWriting(false)
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
    setWriting(false)
    setError('')
  }

  if (!current || !contact) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-[1.6rem] bg-paper p-6 shadow-2xl sm:p-8">
        <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Après le rendez-vous</p>
        <h2 className="mt-1 font-display text-3xl">{contact.name}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {formatDateTime(current.startAt)}
          {contact.company ? ` · ${contact.company}` : ''}
        </p>
        <p className="mt-3 text-sm text-ink-soft">Que fait-on maintenant ?</p>

        {writing ? (
          <label className="mt-5 block text-sm font-medium">
            Note
            <textarea
              className={`${fieldClass} min-h-28 resize-y`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ce qu’il faut retenir de cet échange…"
            />
          </label>
        ) : null}

        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-2">
          {contact.kind === 'prospect' ? (
            <button type="button" disabled={pending} onClick={() => submit('client')} className={primaryBtn}>
              Passer en client
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
          {writing ? (
            <button type="button" disabled={pending} onClick={() => submit('note')} className={primaryBtn}>
              {pending ? 'Enregistrement…' : 'Enregistrer la note'}
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => setWriting(true)} className={primaryBtn}>
              Ajouter une note
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" className={quietBtn} onClick={postpone}>
            Plus tard
          </button>
          {writing ? (
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                setWriting(false)
                setNote('')
                setError('')
              }}
            >
              Retour
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default FollowUpModal
