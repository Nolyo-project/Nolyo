import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import TestimonialsCarousel from '../components/TestimonialsCarousel'
import { formatPrice, plans } from '../data/plans'

const features = [
  {
    title: 'Clients & prospects',
    text: 'Gardez chaque relation à sa place : suivi, notes, et prochaine action, sans tableur.',
  },
  {
    title: 'Rendez-vous',
    text: 'Planifiez, rappelez, relancez. L’agenda collabore avec votre carnet client.',
  },
  {
    title: 'Revenus & dépenses',
    text: 'Voyez entrer et sortir l’argent, avec une estimation indicative de vos cotisations.',
  },
  {
    title: 'Rappels & e-mail',
    text: 'Une connexion e-mail pour relancer au bon moment, sans jongler entre les boîtes.',
  },
]

const steps = [
  { n: '01', title: 'Organisez', text: 'Clients, notes, rendez-vous : tout tient dans un même tableau de bord.' },
  { n: '02', title: 'Suivez', text: 'Revenus, dépenses, relances. Nolio vous montre ce qui attend une action.' },
  { n: '03', title: 'Automatisez', text: 'Passez en Pro : inbox Instagram, Facebook et e-mail, stats et connexions multiples.' },
]

function Home() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const el = document.querySelector(location.hash)
    el?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash])

  return (
    <main>
      <section id="accueil" className="relative overflow-hidden bg-moss text-cream">
        <div
          className="pointer-events-none absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-copper/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[-30%] left-[-10%] h-[22rem] w-[22rem] rounded-full bg-cream/10 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-cream/60 uppercase">
              Pour indépendants & petites structures
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[1.08] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Clients, agenda,
              <br />
              <span className="italic text-copper">comptes au clair.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-cream/75">
              Nolio réunit tableau de bord, clients, notes, rendez-vous et trésorerie —
              avec un premier mois offert, dès 4,99€.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/abonnement"
                className="rounded-full bg-copper px-6 py-3 text-sm font-semibold text-cream shadow-lg shadow-ink/20 transition hover:bg-copper-dark"
              >
                Demander un abonnement
              </Link>
              <Link
                to="/inscription"
                className="rounded-full border border-cream/20 px-6 py-3 text-sm font-semibold text-cream transition hover:border-cream/40 hover:bg-cream/5"
              >
                J’ai un code
              </Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-cream/10 pt-8">
              <div>
                <dt className="text-xs tracking-wide text-cream/50 uppercase">Essentiel</dt>
                <dd className="mt-1 font-display text-2xl">4,99€</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-cream/50 uppercase">Pro</dt>
                <dd className="mt-1 font-display text-2xl">9,99€</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-cream/50 uppercase">Essai</dt>
                <dd className="mt-1 font-display text-2xl">1 mois</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-4xl border border-cream/15 bg-cream/8 p-5 shadow-2xl shadow-ink/30 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-cream/50">
                <span>Aujourd’hui · Tableau de bord</span>
                <span className="rounded-full bg-copper/90 px-2 py-0.5 font-medium text-cream">
                  En cours
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {['Relance Dupont', 'RDV 14h30', 'Facture reçue', 'Prospect Instagram'].map(
                  (item, i) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-2xl bg-cream/10 px-4 py-3"
                    >
                      <span className="text-sm text-cream/90">{item}</span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-cream/15">
                        <span
                          className="block h-full rounded-full bg-copper"
                          style={{ width: `${[78, 54, 92, 31][i]}%` }}
                        />
                      </span>
                    </div>
                  ),
                )}
              </div>
              <p className="mt-5 font-display text-2xl leading-snug text-cream">
                « Ce qui n’est pas suivi n’est pas encore gagné. »
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-copper uppercase">Le produit</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Tout le fil, dans un tableau de bord.
          </h2>
          <p className="mt-4 text-ink-soft">
            Nolio est l’espace du quotidien : clients, agenda, notes et trésorerie.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[1.6rem] border border-ink/8 bg-cream p-7 shadow-[0_1px_0_rgba(20,23,17,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/5"
            >
              <div className="mb-5 h-1.5 w-10 rounded-full bg-copper" />
              <h3 className="font-display text-2xl">{feature.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="methode" className="bg-paper-2/70">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Trois gestes. C’est tout.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.n} className="border-t border-ink/15 pt-6">
                <p className="font-display text-sm text-copper">{step.n}</p>
                <h3 className="mt-2 font-display text-3xl">{step.title}</h3>
                <p className="mt-3 text-ink-soft">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsCarousel />

      <section id="offres" className="bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <p className="text-xs font-semibold tracking-[0.22em] text-copper uppercase">Offres</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Deux formules. Premier mois offert.
          </h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {plans.map((item) => (
              <Link
                key={item.id}
                to={`/abonnement?plan=${item.id}`}
                className={`flex flex-col rounded-[1.7rem] border p-7 sm:p-8 ${
                  item.featured ? 'border-copper bg-cream' : 'border-ink/8 bg-cream'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {item.featured ? (
                    <span className="rounded-full bg-copper px-2.5 py-1 text-[11px] font-semibold tracking-wide text-cream uppercase">
                      Pro
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                      {item.audience}
                    </span>
                  )}
                  <span className="rounded-full bg-moss/10 px-2.5 py-1 text-[11px] font-semibold text-moss">
                    {item.trial}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-3xl">{item.name}</h3>
                {item.featured ? <p className="mt-2 text-sm text-ink-soft">{item.audience}</p> : null}
                <p className="mt-3 font-display text-4xl">
                  {formatPrice(item.price)}
                  <span className="ml-1 text-base text-ink-soft">/ {item.period}</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                  {item.features.map((feature) => (
                    <li key={feature}>— {feature}</li>
                  ))}
                </ul>
                <span
                  className={`mt-8 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold ${
                    item.featured ? 'bg-copper text-cream' : 'bg-moss text-cream'
                  }`}
                >
                  Choisir {item.id === 'pro' ? 'Pro' : 'Essentiel'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="px-5 py-20 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-4xl bg-copper px-8 py-12 text-cream sm:px-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Prêt à y voir plus clair ?
            </h2>
            <p className="mt-3 max-w-lg text-cream/85">
              Envoyez une demande, recevez un devis, renvoyez-le signé avec le paiement.
              Le président vous remet alors un code unique pour ouvrir votre espace.
            </p>
          </div>
          <Link
            to="/abonnement"
            className="rounded-full bg-cream px-7 py-3.5 text-sm font-semibold text-ink shadow-lg transition hover:bg-paper"
          >
            Faire une demande
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Home
