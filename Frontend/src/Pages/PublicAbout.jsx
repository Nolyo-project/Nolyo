import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, mediaUrl } from '../api/client'
import { copyForTrade } from '../data/trades'
import SeoHead from '../components/SeoHead'
import { PublicPageAside, publicPageChrome, publicPageMainClass } from './PublicPageAside'
import { PublicPageFrame } from './PublicPageFrame'

function PersonCard({ person }) {
  const [flipped, setFlipped] = useState(false)
  const canFlip = Boolean(person.bio)

  return (
    <li className="aspect-3/4 [perspective:56rem]">
      <div
        className={`relative h-full w-full transition duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[1.35rem] bg-moss shadow-[0_18px_36px_-24px_rgba(36,48,38,0.5)] [backface-visibility:hidden]">
          {person.photo ? (
            <img src={mediaUrl(person.photo)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center font-display text-3xl text-cream/70">
              {(person.name || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
            {person.name ? (
              <h3 className="font-display text-lg leading-tight tracking-tight wrap-break-word text-cream">
                {person.name}
              </h3>
            ) : null}
            {person.role ? <p className="mt-1 text-xs text-cream/80">{person.role}</p> : null}
            {person.bio ? (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-cream/70">{person.bio}</p>
            ) : null}
            {canFlip ? (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="mt-2 text-[11px] font-semibold text-cream underline decoration-cream/40 underline-offset-2 hover:decoration-cream"
              >
                Lire plus
              </button>
            ) : null}
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.35rem] bg-moss p-3.5 text-cream shadow-[0_18px_36px_-24px_rgba(36,48,38,0.5)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-4">
          {person.name ? (
            <h3 className="font-display text-lg leading-tight tracking-tight wrap-break-word">{person.name}</h3>
          ) : null}
          {person.role ? <p className="mt-1 text-xs text-cream/75">{person.role}</p> : null}
          {person.bio ? (
            <p className="mt-3 min-h-0 flex-1 overflow-y-auto text-xs leading-relaxed wrap-break-word whitespace-pre-line text-cream/90">
              {person.bio}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setFlipped(false)}
            className="mt-3 text-left text-[11px] font-semibold text-cream underline decoration-cream/40 underline-offset-2 hover:decoration-cream"
          >
            Retour
          </button>
        </div>
      </div>
    </li>
  )
}

function PublicAbout() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setPage(null)
    setError('')
    api(`/api/public/pages/${slug}`)
      .then((data) => setPage(data.page))
      .catch((err) => setError(err.message))
  }, [slug])

  const about = page?.about || { body: '', people: [] }
  const people = (about.people || []).filter((person) => person.name || person.photo || person.role || person.bio)
  const copy = copyForTrade(page?.trade)
  const { hasAside } = publicPageChrome(page, slug)
  const teamLabel = people.length > 1 ? 'L’équipe' : 'Portrait'
  const pageUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${slug}/a-propos` : `/p/${slug}/a-propos`
  const seoDescription =
    about.body?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `À propos de ${page?.title || 'ce professionnel'} — ${page?.tradeLabel || copy.label} sur Nolyo.`
  const seoImage = mediaUrl(page?.banner || page?.avatar || '')

  return (
    <PublicPageFrame slug={slug} page={page} error={error} current="about">
      {page ? (
        <SeoHead
          title={`À propos — ${page.title} | Nolyo`}
          description={seoDescription}
          image={seoImage || undefined}
          url={pageUrl}
        />
      ) : null}
      {page ? (
        <main className={publicPageMainClass(hasAside)}>
          <div className="min-w-0">
            <p className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">À propos</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.12] tracking-tight wrap-break-word sm:text-5xl lg:text-[3.4rem]">
              {page.title || page.name}
            </h1>
            {page.tradeLabel || copy.label !== 'Autre métier' ? (
              <p className="page-muted mt-3 text-base sm:text-lg">{page.tradeLabel || copy.label}</p>
            ) : null}

            {about.body ? (
              <section className="mt-12 max-w-3xl">
                <h2 className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">La maison</h2>
                <span className="page-accent-bar mt-3 block h-px w-12 opacity-70" />
                <p className="page-muted mt-7 text-lg leading-[1.8] wrap-break-word whitespace-pre-line sm:text-[1.2rem] sm:leading-[1.85]">
                  {about.body}
                </p>
              </section>
            ) : null}

            {people.length ? (
              <section className="mt-16">
                <h2 className="page-accent text-[11px] font-semibold tracking-[0.22em] uppercase">{teamLabel}</h2>
                <span className="page-accent-bar mt-3 block h-px w-12 opacity-70" />
                <ul
                  className={`mt-8 grid justify-start gap-3 sm:gap-4 ${
                    people.length === 1
                      ? 'max-w-[13.5rem]'
                      : people.length === 2
                        ? 'max-w-[28rem] grid-cols-2'
                        : 'max-w-[42rem] grid-cols-2 sm:grid-cols-3'
                  }`}
                >
                  {people.map((person, index) => (
                    <PersonCard key={`${person.name}-${index}`} person={person} />
                  ))}
                </ul>
              </section>
            ) : !about.body ? (
              <p className="page-muted mt-12 max-w-3xl text-lg leading-relaxed">La présentation arrive bientôt.</p>
            ) : null}
          </div>

          <PublicPageAside page={page} slug={slug} copy={copy} />
        </main>
      ) : null}
    </PublicPageFrame>
  )
}

export default PublicAbout
