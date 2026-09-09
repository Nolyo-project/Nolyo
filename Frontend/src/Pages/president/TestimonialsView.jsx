import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Empty, formatDate } from './shared'

const STATUS_LABEL = {
  pending: 'En attente',
  approved: 'Publié',
  rejected: 'Refusé',
}

function stars(rating) {
  return (
    <span className="tracking-wide text-copper" aria-label={`${rating} sur 5`}>
      {'★★★★★'.slice(0, rating)}
      <span className="opacity-30">{'★★★★★'.slice(rating)}</span>
    </span>
  )
}

export default function TestimonialsView() {
  const [reviews, setReviews] = useState([])
  const [filter, setFilter] = useState('pending')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  async function load(status = filter) {
    const qs = status === 'all' ? '' : `?status=${status}`
    const data = await api(`/api/president/testimonials${qs}`)
    setReviews(data.reviews || [])
  }

  useEffect(() => {
    load(filter).catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function setStatus(id, status) {
    setError('')
    setBusy(id)
    try {
      const data = await api(`/api/president/testimonials/${id}`, {
        method: 'PATCH',
        body: { status },
      })
      setReviews((current) => {
        if (filter !== 'all' && data.review.status !== filter) {
          return current.filter((item) => item.id !== id)
        }
        return current.map((item) => (item.id === id ? data.review : item))
      })
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function remove(id) {
    if (!window.confirm('Supprimer définitivement cet avis ?')) return
    setError('')
    setBusy(id)
    try {
      await api(`/api/president/testimonials/${id}`, { method: 'DELETE' })
      setReviews((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-tight">Avis du site</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Les avis laissés sur la page d’accueil. Validez-les avant publication.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['pending', 'À valider'],
          ['approved', 'Publiés'],
          ['rejected', 'Refusés'],
          ['all', 'Tous'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === id ? 'bg-moss text-cream' : 'bg-cream text-ink-soft ring-1 ring-ink/8 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      {reviews.length === 0 ? (
        <Empty>
          {filter === 'pending' ? 'Aucun avis en attente.' : 'Aucun avis dans cette liste.'}
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {reviews.map((item) => (
            <li key={item.id} className="rounded-[1.35rem] bg-cream p-5 ring-1 ring-ink/8">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.authorName}</p>
                  <p className="text-xs text-ink-soft">
                    {[item.role, item.place].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                  {STATUS_LABEL[item.status] || item.status}
                </span>
              </div>
              <div className="mt-2">{stars(item.rating)}</div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft whitespace-pre-line">{item.body}</p>
              {item.authorEmail ? <p className="mt-2 text-xs text-ink-soft">{item.authorEmail}</p> : null}
              <p className="mt-2 text-[11px] text-ink-soft/80">{formatDate(item.createdAt)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.status !== 'approved' ? (
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => setStatus(item.id, 'approved')}
                    className="rounded-full bg-moss px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-50"
                  >
                    Accepter
                  </button>
                ) : null}
                {item.status !== 'rejected' ? (
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => setStatus(item.id, 'rejected')}
                    className="rounded-full bg-cream px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-ink/12 disabled:opacity-50"
                  >
                    Refuser
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => remove(item.id)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-800/80 hover:bg-red-50 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
