import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { copyForTrade } from '../data/trades'
import { hasAboutContent, servicePriceLabel } from '../data/pageTheme'
import { formatMoney } from './dashboard/format'
import { PublicPageAside, publicPageChrome, publicPageMainClass } from './PublicPageAside'
import { PublicPageFrame } from './PublicPageFrame'

function PublicProfile() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(-1)

  useEffect(() => {
    setPage(null)
    setError('')
    api(`/api/public/pages/${slug}`)
      .then((data) => setPage(data.page))
      .catch((err) => setError(err.message))
  }, [slug])

  useEffect(() => {
    const count = (page?.photos || []).length
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
  }, [lightbox, page])

  const photos = page?.photos || []
  const copy = copyForTrade(page?.trade)
  const { hasAside } = publicPageChrome(page, slug)
  const lightboxSrc = lightbox >= 0 ? photos[lightbox] : ''

  return (
    <PublicPageFrame slug={slug} page={page} error={error} current="home">
      {page ? (
        <>
          <main className={publicPageMainClass(hasAside)}>
            <div className="min-w-0">
              <h1 className="max-w-3xl font-display text-4xl leading-[1.12] tracking-tight wrap-break-word sm:text-5xl lg:text-[3.4rem]">
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
                  <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                    {page.services.map((item) => (
                      <li key={item._id} className="page-card rounded-[1.4rem] px-6 py-5 ring-1 ring-ink/8">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="page-muted mt-1 text-sm">{item.durationMinutes} min</p>
                          </div>
                          <p className="shrink-0 font-display text-xl">{servicePriceLabel(item, formatMoney)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {photos.length ? (
                <section className="mt-16">
                  <h2 className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">Photos</h2>
                  <span className="page-accent-bar mt-3 block h-px w-12 opacity-70" />
                  <ul
                    className={`mt-8 grid gap-3 sm:gap-5 ${
                      photos.length === 1 ? 'max-w-3xl' : photos.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
                    }`}
                  >
                    {photos.map((src, index) => (
                      <li key={src}>
                        <button
                          type="button"
                          onClick={() => setLightbox(index)}
                          className="group block w-full overflow-hidden rounded-[1.4rem]"
                        >
                          <img
                            src={src}
                            alt=""
                            className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                          />
                        </button>
                      </li>
                    ))}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 sm:p-10"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLightbox(-1)
          }}
        >
          {photos.length > 1 ? (
            <button
              type="button"
              aria-label="Photo précédente"
              className="absolute left-4 grid h-12 w-12 place-items-center rounded-full bg-cream/90 text-xl text-ink transition hover:bg-cream sm:left-8"
              onClick={() => setLightbox((current) => (current - 1 + photos.length) % photos.length)}
            >
              ‹
            </button>
          ) : null}
          <img src={lightboxSrc} alt="" className="max-h-[88vh] max-w-[min(100%,64rem)] rounded-[1.2rem] object-contain shadow-2xl" />
          {photos.length > 1 ? (
            <button
              type="button"
              aria-label="Photo suivante"
              className="absolute right-4 grid h-12 w-12 place-items-center rounded-full bg-cream/90 text-xl text-ink transition hover:bg-cream sm:right-8"
              onClick={() => setLightbox((current) => (current + 1) % photos.length)}
            >
              ›
            </button>
          ) : null}
          <p className="absolute bottom-6 text-sm text-cream/80">
            {lightbox + 1} / {photos.length}
          </p>
        </div>
      ) : null}
    </PublicPageFrame>
  )
}

export default PublicProfile
