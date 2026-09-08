import { useEffect, useRef, useState } from 'react'

const quotes = [
  {
    name: 'Léa Moreau',
    role: 'Graphiste indépendante',
    place: 'Lyon',
    text: 'Avant, mes relances vivaient dans trois carnets. Nolyo me montre qui attendre, qui relancer, et ce qui rentre ce mois-ci — sans me transformer en comptable.',
  },
  {
    name: 'Karim El Amrani',
    role: 'Consultant',
    place: 'Paris',
    text: 'On a remplacé le tableur, le calendrier et la boîte mail éparpillée. Moins de bruit, plus de décisions. L’équipe s’y est mise en une journée.',
  },
  {
    name: 'Camille Roux',
    role: 'Coach professionnelle',
    place: 'Nantes',
    text: 'Mes prospects ne se perdent plus. Un rendez-vous, une note, une relance : tout reste au même endroit. Je retrouve enfin le fil de la semaine.',
  },
  {
    name: 'Thomas Berger',
    role: 'Artisan',
    place: 'Bordeaux',
    text: 'Je n’avais pas besoin d’un logiciel de gestion. Juste de voir mes clients, mes chantiers et ce qui reste à encaisser. Nolyo fait exactement ça.',
  },
  {
    name: 'Sofia Martins',
    role: 'Photographe',
    place: 'Lisbonne & Paris',
    text: 'Les demandes Instagram se perdaient. Maintenant je les centralise, je note le brief, je pose le RDV. Le premier mois offert m’a laissé le temps de m’y faire.',
  },
  {
    name: 'Inès Benali',
    role: 'Architecte d’intérieur',
    place: 'Marseille',
    text: 'J’ai une vue simple : qui relancer, quel devis attend, ce qui est déjà payé. Plus de dimanche soir à reconstruire le mois dans un tableur.',
  },
  {
    name: 'Julien Capel',
    role: 'Formateur',
    place: 'Lille',
    text: 'Les rappels partent au bon moment, les notes de séance restent collées au client. C’est calme, lisible, et ça ne me demande pas d’apprendre un métier en plus.',
  },
  {
    name: 'Nadia Petit',
    role: 'Thérapeute',
    place: 'Toulouse',
    text: 'L’agenda et le carnet client se parlent enfin. Je vois la semaine d’un coup d’œil, sans empiler les applis. C’est devenu le réflexe du matin.',
  },
]

export const reviewStats = {
  rating: 4.9,
  count: quotes.length,
}

export const reviewFaces = quotes.slice(0, 5).map((quote) => ({
  name: quote.name,
  initials: quote.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join(''),
}))

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
}

function TestimonialsCarousel() {
  const scrollerRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const userScrolling = useRef(false)

  function goTo(next) {
    const el = scrollerRef.current
    if (!el) return
    const card = el.children[next]
    if (!card) return
    el.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
    setIndex(next)
  }

  function step(delta) {
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
    if (paused) return undefined
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
  }, [paused])

  return (
    <section id="avis" className="overflow-hidden bg-moss text-cream">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-cream/55 uppercase">Avis</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Ils ont retrouvé le fil.
            </h2>
            <p className="mt-3 max-w-lg text-cream/70">
              Indépendants, studios, cabinets : ceux qui ont ouvert un espace Nolyo racontent le
              quotidien, pas un argumentaire.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-cream/20 text-cream transition hover:bg-cream/10"
              aria-label="Avis précédent"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-cream/20 text-cream transition hover:bg-cream/10"
              aria-label="Avis suivant"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

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
                key={quote.name}
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
                      {quote.role} · {quote.place}
                    </p>
                  </div>
                </div>
                <p className="mt-6 font-display text-xl leading-snug font-medium sm:text-2xl">
                  “{quote.text}”
                </p>
              </blockquote>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Choisir un avis">
            {quotes.map((quote, i) => (
              <button
                key={quote.name}
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
      </div>
    </section>
  )
}

export default TestimonialsCarousel
