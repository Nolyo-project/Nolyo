import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import TestimonialsCarousel, { reviewStats } from '../components/TestimonialsCarousel'
import TryPreviewButton from '../components/TryPreviewButton'
import { formatPrice, paymentNote, plans } from '../data/plans'

const dashboardPoints = [
  { title: 'Le fil du jour', text: 'Rendez-vous, relances, ce qui rentre ce mois-ci.' },
  { title: 'Vos clients', text: 'Clients et prospects : une fiche, des notes, une prochaine action.' },
  { title: 'L’agenda', text: 'Créneaux, congés, rendez-vous — tout au même endroit.' },
  { title: 'Ce qui rentre', text: 'La trésorerie, un mois à la fois.' },
]

const pagePoints = [
  { title: 'Votre vitrine', text: 'Accueil, à propos, photos, couleurs, l’équipe.' },
  { title: 'On réserve chez vous', text: 'Un visiteur choisit un créneau. Ça arrive dans votre agenda.' },
  { title: 'À partager', text: 'Un QR Code, un lien. Comptoir, carte de visite, stories.' },
]

const trustPoints = [
  {
    title: 'Paiements Stripe',
    text: 'Vos abonnements passent par Stripe : carte sécurisée, normes bancaires.',
  },
  {
    title: 'Au choix chaque mois',
    text: 'Prélèvement automatique, ou paiement manuel — vous choisissez comment régler.',
  },
  {
    title: '1er mois offert',
    text: 'Puis 6 mois d’engagement. Transparent, sans surprise sur la durée.',
  },
  {
    title: 'Essai 5 minutes',
    text: 'Testez Essentiel ou Pro tout de suite, sans créer de compte.',
  },
]

const subscribeSteps = [
  {
    n: '01',
    title: 'Vous essayez',
    text: 'Cinq minutes sur Essentiel ou Pro, sans compte ni carte. Vous ouvrez le vrai tableau de bord, cliquez partout, voyez si ça vous correspond.',
  },
  {
    n: '02',
    title: 'Vous demandez',
    text: 'À la fin de l’essai — ou quand vous êtes prêt — vous envoyez une demande. On vous recontacte, on vous envoie un devis. Le premier mois est offert.',
  },
  {
    n: '03',
    title: 'Vous démarrez',
    text: 'Dès le devis signé, vous recevez un code unique. Vous créez votre compte, vous configurez votre activité, et votre espace Nolyo est prêt.',
  },
]

const compareRows = [
  { label: 'Tableau de bord', essentiel: true, pro: true },
  { label: 'Clients, prospects, notes', essentiel: true, pro: true },
  { label: 'Agenda et congés', essentiel: true, pro: true },
  { label: 'Relances', essentiel: true, pro: true },
  { label: 'Revenus, mois par mois', essentiel: true, pro: true },
  { label: 'Paiement Stripe (auto ou manuel)', essentiel: true, pro: true },
  { label: 'Page professionnelle', essentiel: false, pro: true },
  { label: 'Réservation et devis en ligne', essentiel: false, pro: true },
  { label: 'QR Code', essentiel: false, pro: true },
  { label: 'Avis clients', essentiel: false, pro: true },
  { label: 'Statistiques', essentiel: false, pro: true },
  { label: 'Dépenses et cotisations', essentiel: false, pro: true },
]

const previewStats = [
  { label: 'Ce mois', value: '1 240 €', hint: 'encaissé' },
  { label: 'Aujourd’hui', value: '3', hint: 'rendez-vous' },
  { label: 'Clients', value: '18', hint: 'au carnet' },
  { label: 'À relancer', value: '2', hint: 'en attente', dark: true },
]

function Mark({ on }) {
  return on ? (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-moss text-[11px] font-semibold text-cream">
      ✓
    </span>
  ) : (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/8 text-[11px] font-semibold text-ink/30">
      —
    </span>
  )
}

function Stars({ rating }) {
  const filled = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-0.5 text-copper" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className="h-4 w-4" fill={n <= filled ? 'currentColor' : 'none'}>
          <path
            d="M10 2.5l2.2 4.46 4.92.72-3.56 3.47.84 4.9L10 13.74 5.6 16.05l.84-4.9L2.88 7.68l4.92-.72L10 2.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}

function formatMembers(count) {
  return new Intl.NumberFormat('fr-FR').format(count)
}

function Home() {
  const location = useLocation()
  const [stats, setStats] = useState({ members: null, faces: [] })
  const [avisStats, setAvisStats] = useState({ rating: reviewStats.rating, count: reviewStats.count })

  useEffect(() => {
    if (!location.hash) return
    const el = document.querySelector(location.hash)
    el?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash])

  useEffect(() => {
    api('/api/public/stats')
      .then((data) =>
        setStats({
          members: Number(data.members) || 0,
          faces: Array.isArray(data.faces) ? data.faces : [],
        }),
      )
      .catch(() => setStats({ members: 0, faces: [] }))
  }, [])

  const members = stats.members
  const faces = stats.faces
  const ratingLabel = Number(avisStats.rating || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  return (
    <main className="bg-paper">
      <section id="accueil" className="dash-sidebar relative overflow-hidden text-cream">
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pt-16 pb-10 sm:px-8 lg:grid-cols-2 lg:pt-24 lg:pb-12">
          <div>
            <p className="inline-flex rounded-full bg-copper px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-cream uppercase">
              1er mois offert
            </p>
            <h1 className="mt-6 font-display text-5xl leading-[1.06] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Gérer.
              <br />
              Présenter.
              <br />
              <span className="italic text-copper">Développer.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-cream/75">
              L’outil des indépendants : agenda, clients, relances. En Pro, une page pour être trouvé et réserver en
              ligne.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <TryPreviewButton plan="pro">Essayer Pro · 5 min</TryPreviewButton>
              <TryPreviewButton plan="essentiel" variant="ghost">
                Essayer Essentiel · 5 min
              </TryPreviewButton>
            </div>
            <p className="mt-4 text-sm text-cream/50">Sans compte. Sans carte. Vous choisissez la formule à tester.</p>
          </div>

          <div className="rounded-[1.5rem] bg-cream p-5 text-ink shadow-2xl shadow-ink/25 ring-1 ring-ink/6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Tableau de bord</p>
                <p className="mt-0.5 text-sm font-medium">Maison Brume</p>
              </div>
              <span className="rounded-full bg-moss px-3 py-1.5 text-[11px] font-semibold tracking-wide text-cream uppercase">
                Nolyo Pro
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {previewStats.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-[1.15rem] p-3.5 ring-1 ${
                    item.dark ? 'bg-moss text-cream ring-moss' : 'bg-paper ring-ink/6'
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold tracking-[0.16em] uppercase ${
                      item.dark ? 'text-cream/55' : 'text-ink-soft'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-1.5 font-display text-2xl tracking-tight">{item.value}</p>
                  <p className={`text-xs ${item.dark ? 'text-cream/70' : 'text-ink-soft'}`}>{item.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pb-12 sm:px-8 lg:pb-16">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-[1.35rem] bg-cream/12 px-5 py-4 ring-1 ring-cream/12 backdrop-blur-sm">
              {faces.length > 0 ? (
                <div className="flex -space-x-2.5">
                  {faces.map((face) =>
                    face.avatar ? (
                      <img
                        key={`${face.name}-${face.avatar}`}
                        src={face.avatar}
                        alt=""
                        title={face.name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-moss"
                      />
                    ) : (
                      <span
                        key={`${face.name}-${face.initials}`}
                        title={face.name}
                        className="grid h-10 w-10 place-items-center rounded-full bg-cream text-[11px] font-semibold text-moss ring-2 ring-moss"
                      >
                        {face.initials}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
              <div>
                <p className="font-display text-3xl tracking-tight">
                  {members === null ? '…' : formatMembers(members)}
                </p>
                <p className="text-sm text-cream/65">
                  {members === 1 ? 'indépendant sur Nolyo' : 'indépendants sur Nolyo'}
                </p>
              </div>
            </div>
            <Link
              to="/#avis"
              className="flex items-center justify-between gap-4 rounded-[1.35rem] bg-cream px-5 py-4 text-ink shadow-lg shadow-ink/10 ring-1 ring-cream/80 transition hover:-translate-y-0.5"
            >
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Avis</p>
                <p className="mt-1 font-display text-3xl tracking-tight">
                  {ratingLabel}
                  <span className="ml-1 text-base font-sans font-medium text-ink-soft">/ 5</span>
                </p>
              </div>
              <div className="text-right">
                <Stars rating={avisStats.rating} />
                <p className="mt-1 text-sm text-ink-soft">{avisStats.count} avis</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section id="confiance" className="border-b border-ink/6 bg-cream/40">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">En toute confiance</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Payez sereinement. Testez avant de vous engager.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-ink-soft">{paymentNote}</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((item) => (
              <article key={item.title}>
                <p className="font-medium text-ink">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="produit" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">Le produit</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Votre espace, et votre vitrine.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.5rem] bg-cream p-7 ring-1 ring-ink/6 sm:p-8">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Essentiel et Pro</p>
            <h3 className="mt-2 font-display text-3xl">Le tableau de bord</h3>
            <p className="mt-3 text-ink-soft">
              Votre espace privé. Clients, agenda, congés, notes, ce qui rentre — et les relances qui comptent.
            </p>
            <ul className="mt-6 space-y-3">
              {dashboardPoints.map((item) => (
                <li key={item.title}>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-ink-soft">{item.text}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <TryPreviewButton plan="essentiel" variant="header">
                Tester Essentiel
              </TryPreviewButton>
            </div>
          </article>

          <article className="rounded-[1.5rem] bg-moss p-7 text-cream sm:p-8">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Nolyo Pro</p>
            <h3 className="mt-2 font-display text-3xl">La page professionnelle</h3>
            <p className="mt-3 text-cream/75">
              Votre devanture. Les gens vous voient, réservent, laissent un avis. Vous, vous restez dans le tableau de
              bord.
            </p>
            <ul className="mt-6 space-y-3">
              {pagePoints.map((item) => (
                <li key={item.title}>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-cream/70">{item.text}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <TryPreviewButton plan="pro">Tester Pro</TryPreviewButton>
            </div>
          </article>
        </div>
      </section>

      <section id="fonctionnement" className="bg-paper-2/80">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">Comment ça marche</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            De l’essai au vrai compte.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Pas d’inscription forcée pour tester. Vous essayez d’abord, vous demandez ensuite, puis vous activez votre
            espace avec un code. Le premier mois est offert sur Essentiel comme sur Pro.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {subscribeSteps.map((step) => (
              <article key={step.n} className="rounded-[1.5rem] bg-cream p-6 ring-1 ring-ink/6">
                <p className="font-display text-sm text-copper">{step.n}</p>
                <h3 className="mt-3 font-display text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="offres" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">Offres</p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Deux formules. Le premier mois est offert.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">{paymentNote}</p>

        <div className="mt-12 overflow-hidden rounded-[1.5rem] bg-cream ring-1 ring-ink/6">
          <div className="grid grid-cols-[minmax(0,1.4fr)_7rem_7rem] border-b border-ink/8 px-5 py-4 text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase sm:grid-cols-[minmax(0,1fr)_10rem_10rem] sm:px-8">
            <span>Inclus</span>
            <span className="text-center">Essentiel</span>
            <span className="text-center">Pro</span>
          </div>
          {compareRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,1.4fr)_7rem_7rem] items-center border-t border-ink/6 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_10rem_10rem] sm:px-8"
            >
              <p className="pr-3 text-sm">{row.label}</p>
              <div className="flex justify-center">
                <Mark on={row.essentiel} />
              </div>
              <div className="flex justify-center">
                <Mark on={row.pro} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {plans.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col rounded-[1.5rem] bg-cream p-7 ring-1 sm:p-8 ${
                item.featured ? 'ring-copper/35' : 'ring-ink/6'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${
                    item.featured ? 'bg-moss text-cream' : 'bg-moss/10 text-moss'
                  }`}
                >
                  {item.id === 'pro' ? 'Nolyo Pro' : 'Nolyo Essentiel'}
                </span>
                <span className="rounded-full bg-copper px-2.5 py-1 text-[11px] font-semibold text-cream">
                  1er mois offert
                </span>
              </div>
              <p className="mt-5 font-display text-4xl">
                {formatPrice(item.price)}
                <span className="ml-1 text-base text-ink-soft">/ {item.period}</span>
              </p>
              <p className="mt-2 text-sm text-ink-soft">{item.audience}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                {item.features.map((feature) => (
                  <li key={feature}>— {feature}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-2">
                <TryPreviewButton
                  plan={item.id}
                  variant={item.featured ? 'hero' : 'header'}
                  className={item.featured ? '' : '!bg-moss'}
                >
                  Essayer 5 min
                </TryPreviewButton>
                <Link
                  to={`/abonnement?plan=${item.id}`}
                  className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold ring-1 transition ${
                    item.featured
                      ? 'ring-copper/40 text-ink hover:bg-copper/5'
                      : 'ring-ink/12 text-ink hover:bg-ink/5'
                  }`}
                >
                  Demander {item.id === 'pro' ? 'Pro' : 'Essentiel'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <TestimonialsCarousel onStats={setAvisStats} />

      <section id="contact" className="px-5 py-20 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-[1.5rem] bg-moss px-8 py-12 text-cream sm:px-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Essayez 5 minutes.</h2>
            <p className="mt-3 max-w-lg text-cream/80">
              Essentiel ou Pro — sans compte. Ensuite, le premier mois est offert. Paiement sécurisé via Stripe.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <TryPreviewButton plan="pro">Essayer Pro</TryPreviewButton>
            <TryPreviewButton plan="essentiel" variant="ghost">
              Essayer Essentiel
            </TryPreviewButton>
            <Link
              to="/abonnement"
              className="rounded-full bg-cream px-7 py-3.5 text-sm font-semibold text-ink transition hover:bg-paper"
            >
              Faire une demande
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home
