import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { ghostBtn, primaryBtn, quietBtn } from './ui'

const STATUS_LABEL = {
  pending: 'En attente',
  approved: 'Publié',
  rejected: 'Refusé',
}

const PER_PAGE = 9

function stars(rating) {
  return (
    <span className="tracking-wide text-copper" aria-label={`${rating} sur 5`}>
      {'★★★★★'.slice(0, rating)}
      <span className="opacity-30">{'★★★★★'.slice(rating)}</span>
    </span>
  )
}

export function PageReviewsEditor() {
  const [reviews, setReviews] = useState([])
  const [filter, setFilter] = useState('pending')
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  async function load(status = filter) {
    const qs = status === 'all' ? '' : `?status=${status}`
    const data = await api(`/api/workspace/reviews${qs}`)
    setReviews(data.reviews || [])
    setPage(0)
  }

  useEffect(() => {
    load(filter).catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const pageCount = Math.max(1, Math.ceil(reviews.length / PER_PAGE))
  const currentPage = Math.min(page, pageCount - 1)
  const slice = reviews.slice(currentPage * PER_PAGE, currentPage * PER_PAGE + PER_PAGE)

  async function setStatus(id, status) {
    setError('')
    setBusy(id)
    try {
      const data = await api(`/api/workspace/reviews/${id}`, { method: 'PATCH', body: { status } })
      setReviews((current) => {
        if (filter !== 'all' && data.review.status !== filter) {
          return current.filter((item) => item._id !== id)
        }
        return current.map((item) => (item._id === id ? data.review : item))
      })
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
      await api(`/api/workspace/reviews/${id}`, { method: 'DELETE' })
      setReviews((current) => current.filter((item) => item._id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display text-2xl">Avis clients</p>
        <p className="mt-1 text-sm text-ink-soft">
          Les visiteurs laissent un avis sur votre page. Vous les validez ici avant publication.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['pending', 'À valider'],
          ['approved', 'Publiés'],
          ['rejected', 'Refusés'],
          ['all', 'Tous'],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} className={filter === id ? primaryBtn : ghostBtn}>
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      {reviews.length ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {slice.map((item) => (
              <li key={item._id} className="flex flex-col rounded-[1.4rem] bg-[#faf8f5] p-5 ring-1 ring-ink/8">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.authorName}</p>
                  <p className="mt-1 text-sm">{stars(item.rating)}</p>
                  <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                  <p className="mt-3 text-xs text-ink-soft">
                    {STATUS_LABEL[item.status] || item.status}
                    {item.authorEmail ? ` · ${item.authorEmail}` : ''}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/8 pt-3">
                  {item.status !== 'approved' ? (
                    <button
                      type="button"
                      disabled={busy === item._id}
                      className={quietBtn}
                      onClick={() => setStatus(item._id, 'approved')}
                    >
                      Accepter
                    </button>
                  ) : null}
                  {item.status !== 'rejected' ? (
                    <button
                      type="button"
                      disabled={busy === item._id}
                      className={quietBtn}
                      onClick={() => setStatus(item._id, 'rejected')}
                    >
                      Refuser
                    </button>
                  ) : null}
                  <button type="button" disabled={busy === item._id} className={quietBtn} onClick={() => remove(item._id)}>
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {pageCount > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-ink-soft">
                Page {currentPage + 1} / {pageCount} · {reviews.length} avis
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Précédent
                </button>
                <div className="flex gap-1.5">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Page ${i + 1}`}
                      onClick={() => setPage(i)}
                      className={`h-2.5 w-2.5 rounded-full transition ${
                        i === currentPage ? 'bg-moss' : 'bg-ink/15 hover:bg-ink/30'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Suivant
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-ink-soft">
          {filter === 'pending' ? 'Aucun avis en attente.' : 'Aucun avis dans cette liste.'}
        </p>
      )}
    </div>
  )
}
