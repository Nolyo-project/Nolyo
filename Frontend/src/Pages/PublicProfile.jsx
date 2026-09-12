import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, mediaUrl, siteHostname, sitePreviewUrl, websiteHref } from '../api/client'
import { loadPublicPage } from '../data/demoPublicPage'
import { copyForTrade } from '../data/trades'
import { groupServicesByHeading, hasAboutContent, pagePortrait, servicePriceLabel } from '../data/pageTheme'
import { formatMoney } from './dashboard/format'
import { Modal } from './dashboard/ui'
import { PublicPageAside, publicPageChrome, publicPageMainClass } from './PublicPageAside'
import { PublicPageFrame } from './PublicPageFrame'
import SeoHead from '../components/SeoHead'

function StarRating({ value = 0, onChange, size = 'md', readOnly = false }) {
  const cls = size === 'lg' ? 'text-3xl' : 'text-lg'
  return (
    <div className={`flex gap-1 ${cls}`} role={readOnly ? 'img' : 'group'} aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value
        if (readOnly) {
          return (
            <span key={n} className={active ? 'page-accent' : 'page-muted opacity-40'} aria-hidden>
              ★
            </span>
          )
        }
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            className={`leading-none transition ${active ? 'page-accent' : 'page-muted opacity-35 hover:opacity-70'}`}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

function pageWorks(page) {
  if (Array.isArray(page?.works)) {
    return page.works
      .slice(0, 2)
      .map((item) => ({
        image: mediaUrl(item?.image || ''),
        url: websiteHref(item?.url || ''),
      }))
      .filter((item) => item.image || item.url)
  }
  return (page?.photos || [])
    .slice(0, 2)
    .map((src) => ({ image: mediaUrl(src), url: '' }))
    .filter((item) => item.image)
}

function workPreview(work) {
  return work.image || sitePreviewUrl(work.url)
}

function WorkMedia({ src, alt, className }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div className="grid aspect-[4/3] place-items-center page-muted text-sm">{alt}</div>
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
}

function chunkReviews(list, size = 3) {
  const pages = []
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size))
  return pages
}

function useReviewsPerPage() {
  const [perPage, setPerPage] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 3 : 1,
  )

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const sync = () => setPerPage(query.matches ? 3 : 1)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return perPage
}

function ReviewCard({ item }) {
  return (
    <article className="page-card flex h-full min-h-44 flex-col rounded-[1.4rem] px-6 py-5 ring-1 ring-ink/8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{item.authorName}</p>
        <StarRating value={item.rating} readOnly />
      </div>
      <p className="page-muted mt-3 flex-1 text-sm leading-relaxed whitespace-pre-line">{item.body}</p>
    </article>
  )
}

function ReviewsCarousel({ reviews, onLeaveReview }) {
  const perPage = useReviewsPerPage()
  const pages = chunkReviews(reviews, perPage)
  const scrollerRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const pageCount = pages.length

  useEffect(() => {
    setIndex(0)
    const el = scrollerRef.current
    if (el) el.scrollTo({ left: 0 })
  }, [reviews.length, perPage])

  function goTo(next) {
    if (!pageCount) return
    const i = ((next % pageCount) + pageCount) % pageCount
    setIndex(i)
    const el = scrollerRef.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    if (pageCount <= 1 || paused) return undefined
    const id = window.setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % pageCount
        const el = scrollerRef.current
        if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
        return next
      })
    }, 5500)
    return () => window.clearInterval(id)
  }, [pageCount, paused])

  if (!reviews.length) {
    return (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="page-muted text-sm">Aucun avis pour le moment. Soyez le premier.</p>
        <button type="button" onClick={onLeaveReview} className="page-cta rounded-full px-5 py-2.5 text-sm font-semibold">
          Laisser un avis
        </button>
      </div>
    )
  }

  return (
    <div
      className="mt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
      }}
    >
      <div
        ref={scrollerRef}
        onScroll={(event) => {
          const el = event.currentTarget
          if (!el.clientWidth) return
          const next = Math.round(el.scrollLeft / el.clientWidth)
          if (next !== index && next >= 0 && next < pageCount) setIndex(next)
        }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((group, pageIndex) => (
          <div
            key={pageIndex}
            className={`grid w-full shrink-0 snap-start gap-4 ${perPage === 3 ? 'md:grid-cols-3' : ''}`}
          >
            {group.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {pageCount > 1 ? (
            <>
              <button
                type="button"
                aria-label="Avis précédents"
                className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-ink/12 transition hover:ring-[var(--page-accent)]"
                onClick={() => goTo(index - 1)}
              >
                ‹
              </button>
              <div className="flex gap-1.5 px-1">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Page ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      i === index ? 'bg-[var(--page-accent)]' : 'bg-ink/15 hover:bg-ink/30'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Avis suivants"
                className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-ink/12 transition hover:ring-[var(--page-accent)]"
                onClick={() => goTo(index + 1)}
              >
                ›
              </button>
            </>
          ) : (
            <span className="page-muted text-xs">{reviews.length} avis</span>
          )}
        </div>
        <button type="button" onClick={onLeaveReview} className="page-cta rounded-full px-5 py-2.5 text-sm font-semibold">
          Laisser un avis
        </button>
      </div>
    </div>
  )
}

function PublicProfile() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(-1)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewForm, setReviewForm] = useState({ authorName: '', authorEmail: '', rating: 5, body: '' })
  const [reviewPending, setReviewPending] = useState(false)
  const [reviewOk, setReviewOk] = useState('')
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    setPage(null)
    setError('')
    loadPublicPage(slug)
      .then(setPage)
      .catch((err) => setError(err.message))
  }, [slug])

  const works = pageWorks(page)
  const photos = works.filter((item) => item.image && !item.url).map((item) => item.image)

  useEffect(() => {
    const count = photos.length
    if (lightbox < 0 || !count) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setLightbox(-1)
      if (event.key === 'ArrowRight') setLightbox((current) => (current + 1) % count)
      if (event.key === 'ArrowLeft') setLightbox((current) => (current - 1 + count) % count)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [lightbox, photos.length])

  const copy = copyForTrade(page?.trade)
  const { hasAside } = publicPageChrome(page, slug)
  const lightboxSrc = lightbox >= 0 ? photos[lightbox] : ''
  const pageUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${slug}` : `/p/${slug}`
  const seoDescription =
    page?.description?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `${page?.title || 'Professionnel'} sur Nolyo — réservation et prestations.`
  const seoImage = mediaUrl(page?.banner || pagePortrait(page) || page?.photos?.[0] || page?.works?.[0]?.image || '')
  const reviewAvg =
    page?.reviews?.length > 0
      ? Math.round(
          (page.reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / page.reviews.length) * 10,
        ) / 10
      : null

  return (
    <PublicPageFrame slug={slug} page={page} error={error} current="home">
      {page ? (
        <SeoHead
          title={`${page.title} | Nolyo`}
          description={seoDescription}
          image={seoImage.startsWith('http') ? seoImage : seoImage ? `${window.location.origin}${seoImage}` : undefined}
          url={pageUrl}
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: page.title,
            description: seoDescription,
            url: pageUrl,
            image: seoImage
              ? seoImage.startsWith('http')
                ? seoImage
                : `${window.location.origin}${seoImage}`
              : undefined,
            telephone: page.phone || undefined,
            email: page.email || undefined,
            address: page.address
              ? {
                  '@type': 'PostalAddress',
                  streetAddress: page.address,
                  addressLocality: page.city || undefined,
                  postalCode: page.postalCode || undefined,
                  addressCountry: 'FR',
                }
              : undefined,
            geo:
              page.lat != null && page.lng != null
                ? { '@type': 'GeoCoordinates', latitude: page.lat, longitude: page.lng }
                : undefined,
            areaServed: page.city || undefined,
            aggregateRating:
              reviewAvg && page.reviews?.length
                ? {
                    '@type': 'AggregateRating',
                    ratingValue: reviewAvg,
                    reviewCount: page.reviews.length,
                    bestRating: 5,
                    worstRating: 1,
                  }
                : undefined,
            hasOfferCatalog: page.services?.filter((s) => s.kind !== 'heading').length
              ? {
                  '@type': 'OfferCatalog',
                  name: 'Prestations',
                  itemListElement: page.services
                    .filter((s) => s.kind !== 'heading')
                    .slice(0, 20)
                    .map((item, index) => ({
                      '@type': 'Offer',
                      position: index + 1,
                      itemOffered: { '@type': 'Service', name: item.name },
                      price: item.price,
                      priceCurrency: 'EUR',
                      url: `${pageUrl}/reserver`,
                    })),
                }
              : undefined,
          }}
        />
      ) : null}
      {page ? (
        <>
          <main className={publicPageMainClass(hasAside)}>
            <div className="min-w-0">
              <h1 className="max-w-3xl font-display text-[2rem] leading-[1.12] tracking-tight wrap-break-word sm:text-5xl lg:text-[3.4rem]">
                {page.title}
              </h1>
              {page.tradeLabel || copy.label !== 'Autre métier' ? (
                <p className="page-muted mt-3 text-base sm:text-lg">{page.tradeLabel || copy.label}</p>
              ) : null}

              {page.description ? (
                <section className="mt-12 max-w-3xl">
                  <h2 className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">{copy.aboutKicker}</h2>
                  <span className="page-accent-bar mt-3 block h-px w-12 opacity-70" />
                  <p className="page-muted mt-7 text-lg leading-[1.8] wrap-break-word whitespace-pre-line sm:text-[1.2rem] sm:leading-[1.85]">
                    {page.description}
                  </p>
                  {hasAboutContent(page) ? (
                    <Link
                      to={`/p/${slug}/a-propos`}
                      className="page-accent mt-6 inline-block text-sm font-medium underline decoration-transparent underline-offset-4 hover:decoration-current"
                    >
                      En savoir plus
                    </Link>
                  ) : null}
                </section>
              ) : null}

              {page.services?.length ? (
                <section className="mt-16">
                  <h2 className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">Prestations</h2>
                  <span className="page-accent-bar mt-3 block h-px w-12 opacity-70" />
                  <div className="mt-8 space-y-8">
                    {groupServicesByHeading(page.services).map((block, index) => (
                      <div key={`${block.title}-${index}`}>
                        {block.title ? (
                          <h3 className="page-accent mb-4 text-[11px] font-semibold tracking-[0.2em] uppercase">
                            {block.title}
                          </h3>
                        ) : null}
                        {block.items.length ? (
                          <ul className="grid gap-4 sm:grid-cols-2">
                            {block.items.map((item) => (
                              <li key={item._id} className="page-card rounded-[1.4rem] px-6 py-5 ring-1 ring-ink/8">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium wrap-break-word">{item.name}</p>
                                    <p className="page-muted mt-1 text-sm">{item.durationMinutes} min</p>
                                  </div>
                                  <p className="shrink-0 font-display text-lg sm:text-xl">{servicePriceLabel(item, formatMoney)}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-16">
                  <div>
                    <h2 className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">Avis</h2>
                    <span className="page-accent-bar mt-3 block h-px w-12 opacity-70" />
                  </div>
                  <ReviewsCarousel
                    reviews={page.reviews || []}
                    onLeaveReview={() => {
                      setReviewError('')
                      setReviewOk('')
                      setReviewOpen(true)
                    }}
                  />
                </section>

              {works.length ? (
                <section className="mt-16">
                  <h2 className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">
                    {works.some((item) => item.url) ? 'Réalisations' : 'Photos'}
                  </h2>
                  <span className="page-accent-bar mt-3 block h-px w-12 opacity-70" />
                  <ul
                    className={`mt-8 grid gap-3 sm:gap-5 ${works.length === 1 ? 'max-w-3xl' : 'sm:grid-cols-2'}`}
                  >
                    {works.map((work, index) => {
                      const preview = workPreview(work)
                      const host = work.url ? siteHostname(work.url) : ''
                      const className =
                        'group relative block w-full overflow-hidden rounded-[1.4rem] text-left'
                      const media = (
                        <WorkMedia
                          src={preview}
                          alt={host || ''}
                          className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                        />
                      )
                      const caption = host ? (
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-4 pb-3 pt-8 text-sm font-medium text-cream">
                          {host}
                        </span>
                      ) : null
                      if (work.url) {
                        return (
                          <li key={`${work.url}-${index}`}>
                            <a
                              href={work.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={className}
                            >
                              {media}
                              {caption}
                            </a>
                          </li>
                        )
                      }
                      const photoIndex = photos.indexOf(work.image)
                      return (
                        <li key={`${work.image}-${index}`}>
                          <button
                            type="button"
                            onClick={() => setLightbox(photoIndex >= 0 ? photoIndex : 0)}
                            className={className}
                          >
                            {media}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ) : null}
            </div>

            <PublicPageAside page={page} slug={slug} copy={copy} />
          </main>
        </>
      ) : null}

      {lightboxSrc ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/80 p-4 sm:p-10"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLightbox(-1)
          }}
        >
          <div className="relative flex w-full max-w-[64rem] items-center justify-center">
            {photos.length > 1 ? (
              <button
                type="button"
                aria-label="Photo précédente"
                className="absolute left-0 hidden h-12 w-12 place-items-center rounded-full bg-cream/90 text-xl text-ink transition hover:bg-cream sm:grid sm:left-2"
                onClick={() => setLightbox((current) => (current - 1 + photos.length) % photos.length)}
              >
                ‹
              </button>
            ) : null}
            <img
              src={lightboxSrc}
              alt=""
              className="max-h-[72svh] max-w-full rounded-[1.2rem] object-contain shadow-2xl sm:max-h-[88vh]"
            />
            {photos.length > 1 ? (
              <button
                type="button"
                aria-label="Photo suivante"
                className="absolute right-0 hidden h-12 w-12 place-items-center rounded-full bg-cream/90 text-xl text-ink transition hover:bg-cream sm:grid sm:right-2"
                onClick={() => setLightbox((current) => (current + 1) % photos.length)}
              >
                ›
              </button>
            ) : null}
          </div>
          {photos.length > 1 ? (
            <div className="mt-4 flex items-center gap-3 sm:hidden">
              <button
                type="button"
                aria-label="Photo précédente"
                className="grid h-11 w-11 place-items-center rounded-full bg-cream/90 text-xl text-ink"
                onClick={() => setLightbox((current) => (current - 1 + photos.length) % photos.length)}
              >
                ‹
              </button>
              <p className="min-w-12 text-center text-sm text-cream/80">
                {lightbox + 1} / {photos.length}
              </p>
              <button
                type="button"
                aria-label="Photo suivante"
                className="grid h-11 w-11 place-items-center rounded-full bg-cream/90 text-xl text-ink"
                onClick={() => setLightbox((current) => (current + 1) % photos.length)}
              >
                ›
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-cream/80 sm:absolute sm:bottom-6 sm:mt-0">
              {lightbox + 1} / {photos.length}
            </p>
          )}
          {photos.length > 1 ? (
            <p className="absolute bottom-6 hidden text-sm text-cream/80 sm:block">
              {lightbox + 1} / {photos.length}
            </p>
          ) : null}
        </div>
      ) : null}
      {reviewOpen ? (
        <Modal
          onClose={() => setReviewOpen(false)}
          panelClassName="max-w-md"
          overlayClassName="z-[60]"
        >
          <p className="page-accent text-[11px] font-semibold tracking-[0.2em] uppercase">Votre avis</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">Laisser un avis</h2>
          <p className="page-muted mt-2 text-sm">Visible après validation par le professionnel.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              setReviewError('')
              setReviewOk('')
              setReviewPending(true)
              try {
                const data = await api(`/api/public/pages/${slug}/reviews`, {
                  method: 'POST',
                  body: reviewForm,
                })
                setReviewOk(data.message || 'Merci — avis envoyé pour validation.')
                setReviewForm({ authorName: '', authorEmail: '', rating: 5, body: '' })
                window.setTimeout(() => setReviewOpen(false), 1400)
              } catch (err) {
                setReviewError(err.message)
              } finally {
                setReviewPending(false)
              }
            }}
          >
            <div>
              <p className="text-sm font-medium">Note</p>
              <div className="mt-2">
                <StarRating
                  value={reviewForm.rating}
                  size="lg"
                  onChange={(rating) => setReviewForm((c) => ({ ...c, rating }))}
                />
              </div>
            </div>
            <label className="block text-sm font-medium">
              Prénom
              <input
                className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--page-accent)]"
                value={reviewForm.authorName}
                onChange={(event) => setReviewForm((c) => ({ ...c, authorName: event.target.value }))}
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm font-medium">
              E-mail <span className="font-normal text-ink-soft">(optionnel)</span>
              <input
                type="email"
                className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--page-accent)]"
                value={reviewForm.authorEmail}
                onChange={(event) => setReviewForm((c) => ({ ...c, authorEmail: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium">
              Votre message
              <textarea
                className="mt-1.5 min-h-28 w-full resize-y rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--page-accent)]"
                value={reviewForm.body}
                onChange={(event) => setReviewForm((c) => ({ ...c, body: event.target.value }))}
                required
                minLength={12}
                placeholder="Ce que vous avez apprécié…"
              />
            </label>
            {reviewError ? <p className="text-sm text-red-700">{reviewError}</p> : null}
            {reviewOk ? <p className="text-sm text-moss">{reviewOk}</p> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={reviewPending}
                className="page-cta rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {reviewPending ? 'Envoi…' : 'Envoyer'}
              </button>
              <button
                type="button"
                className="rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/12"
                onClick={() => setReviewOpen(false)}
              >
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PublicPageFrame>
  )
}

export default PublicProfile
