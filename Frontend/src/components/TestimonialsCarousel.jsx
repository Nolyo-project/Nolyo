import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { Modal } from '../Pages/dashboard/ui'

const emptyForm = { authorName: '', role: '', place: '', authorEmail: '', rating: 5, body: '' }

export const reviewStats = {
  rating: 4.9,
  count: 0,
}

function initials(name) {
  return String(name || '')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function StarPick({ value, onChange }) {
  return (
    <div className="flex gap-1 text-2xl" role="group" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`leading-none transition ${n <= value ? 'text-copper' : 'text-ink/20 hover:text-copper/50'}`}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function TestimonialsCarousel({
  onStats,
  title = 'Ils utilisent déjà Nolyo',
  description = 'Les avis viennent des personnes qui utilisent vraiment Nolyo — pas de textes inventés.',
}) {
  const scrollerRef = useRef(null)
  const [quotes, setQuotes] = useState([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const userScrolling = useRef(false)

  useEffect(() => {
    let cancelled = false
    api('/api/public/testimonials')
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.reviews) ? data.reviews : []
        setQuotes(list)
        const stats = data.stats || { rating: 0, count: list.length }
        reviewStats.rating = stats.rating || 0
        reviewStats.count = stats.count || 0
        onStats?.(stats)
      })
      .catch(() => {
        if (cancelled) return
        setQuotes([])
        onStats?.({ rating: 0, count: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [])

  function goTo(next) {
    const el = scrollerRef.current
    if (!el) return
    const card = el.children[next]
    if (!card) return
    el.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
    setIndex(next)
  }

  function step(delta) {
    if (!quotes.length) return
    const next = (index + delta + quotes.length) % quotes.length
    goTo(next)
  }

  function onScroll() {
    const el = scrollerRef.current
    if (!el) return
    const cards = [...el.children]
    let closest = 0
    let min = Infinity
    cards.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft - el.scrollLeft)
      if (dist < min) {
        min = dist
        closest = i
      }
    })
    setIndex(closest)
  }

  useEffect(() => {
    if (paused || quotes.length <= 1) return undefined
    const timer = window.setInterval(() => {
      if (userScrolling.current) return
      setIndex((current) => {
        const next = (current + 1) % quotes.length
        const el = scrollerRef.current
        el?.scrollTo({ left: el.children[next]?.offsetLeft ?? 0, behavior: 'smooth' })
        return next
      })
    }, 5500)
    return () => window.clearInterval(timer)
  }, [paused, quotes.length])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setOk('')
    setPending(true)
    try {
      const data = await api('/api/public/testimonials', { method: 'POST', body: form })
      setOk(data.message || 'Merci — avis envoyé pour validation.')
      setForm(emptyForm)
      window.setTimeout(() => setOpen(false), 1400)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section id="avis" className="overflow-hidden bg-moss text-cream">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-cream/55 uppercase">Avis</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
            <p className="mt-3 max-w-lg text-cream/70">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError('')
                setOk('')
                setOpen(true)
              }}
              className="rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-copper-dark"
            >
              Ajouter un avis
            </button>
            {quotes.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="grid h-11 w-11 place-items-center rounded-full border border-cream/20 text-cream transition hover:bg-cream/10"
                  aria-label="Avis précédent"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                    <path
                      d="M15 6l-6 6 6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="grid h-11 w-11 place-items-center rounded-full border border-cream/20 text-cream transition hover:bg-cream/10"
                  aria-label="Avis suivant"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {quotes.length === 0 ? (
          <div className="mt-12 rounded-[1.7rem] bg-cream/10 px-6 py-12 text-center">
            <p className="text-cream/75">Les premiers témoignages arriveront prochainement.</p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-5 rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream"
            >
              Ajouter un avis
            </button>
          </div>
        ) : (
          <div
            className="mt-12"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
            }}
          >
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              onPointerDown={() => {
                userScrolling.current = true
                setPaused(true)
              }}
              onPointerUp={() => {
                userScrolling.current = false
              }}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') {
                  event.preventDefault()
                  step(1)
                }
                if (event.key === 'ArrowLeft') {
                  event.preventDefault()
                  step(-1)
                }
              }}
              role="region"
              aria-roledescription="carrousel"
              aria-label="Témoignages clients"
            >
              {quotes.map((quote, i) => (
                <blockquote
                  key={quote.id || `${quote.name}-${i}`}
                  className="w-[min(100%,28rem)] shrink-0 snap-start rounded-[1.7rem] bg-cream/10 p-6 text-cream sm:p-8 lg:w-[calc(50%-0.5rem)]"
                  aria-hidden={i !== index}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-copper text-sm font-semibold text-cream">
                      {initials(quote.name)}
                    </span>
                    <div>
                      <p className="font-semibold">{quote.name}</p>
                      <p className="text-sm text-cream/60">
                        {[quote.role, quote.place].filter(Boolean).join(' · ') || 'Membre Nolyo'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-6 font-display text-xl leading-snug font-medium sm:text-2xl">“{quote.text}”</p>
                </blockquote>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Choisir un avis">
              {quotes.map((quote, i) => (
                <button
                  key={quote.id || `${quote.name}-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Avis ${i + 1} : ${quote.name}`}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition ${
                    i === index ? 'w-8 bg-copper' : 'w-2 bg-cream/30 hover:bg-cream/50'
                  }`}
                />
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-cream/45">
              Faites glisser, utilisez les flèches, ou laissez défiler.
            </p>
          </div>
        )}
      </div>

      {open ? (
        <Modal onClose={() => setOpen(false)} panelClassName="max-w-lg">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">Votre avis</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">Ajouter un avis</h2>
          <p className="mt-2 text-sm text-ink-soft">Il sera publié après validation par Nolyo.</p>
          <form onSubmit={submit} className="mt-6 space-y-4 text-ink">
            <div>
              <p className="text-sm font-medium">Note</p>
              <div className="mt-1.5">
                <StarPick value={form.rating} onChange={(rating) => setForm((c) => ({ ...c, rating }))} />
              </div>
            </div>
            <label className="block text-sm font-medium">
              Nom
              <input
                className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none focus:border-copper"
                value={form.authorName}
                onChange={(event) => setForm((c) => ({ ...c, authorName: event.target.value }))}
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Métier
                <input
                  className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none focus:border-copper"
                  value={form.role}
                  onChange={(event) => setForm((c) => ({ ...c, role: event.target.value }))}
                  placeholder="Ex. Photographe"
                />
              </label>
              <label className="block text-sm font-medium">
                Ville
                <input
                  className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none focus:border-copper"
                  value={form.place}
                  onChange={(event) => setForm((c) => ({ ...c, place: event.target.value }))}
                  placeholder="Ex. Lyon"
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              E-mail (optionnel)
              <input
                type="email"
                className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none focus:border-copper"
                value={form.authorEmail}
                onChange={(event) => setForm((c) => ({ ...c, authorEmail: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium">
              Votre message
              <textarea
                className="mt-1.5 min-h-28 w-full resize-y rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none focus:border-copper"
                value={form.body}
                onChange={(event) => setForm((c) => ({ ...c, body: event.target.value }))}
                required
                minLength={20}
              />
            </label>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            {ok ? <p className="text-sm font-medium text-moss">{ok}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/12"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
              >
                {pending ? 'Envoi…' : 'Envoyer l’avis'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}

export default TestimonialsCarousel
