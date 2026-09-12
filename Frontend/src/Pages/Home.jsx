import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, mediaUrl } from "../api/client";
import LiveAppFrame from "../components/LiveAppFrame";
import TestimonialsCarousel, {
  reviewStats,
} from "../components/TestimonialsCarousel";
import TryPreviewButton from "../components/TryPreviewButton";
import { plans } from "../data/plans";

const DEMO_DASHBOARD = "/apercu/dashboard";
const DEMO_PAGE_FALLBACK = "/p/maison-brume";

const essentiel = plans.find((p) => p.id === "essentiel");
const pro = plans.find((p) => p.id === "pro");

const constatCards = [
  {
    title: "Vos clients",
    text: "Retrouvez vos clients, prospects et informations importantes dans un seul espace.",
  },
  {
    title: "Vos rendez-vous",
    text: "Gérez votre agenda et gardez les informations liées à chaque rendez-vous.",
  },
  {
    title: "Votre activité",
    text: "Suivez votre chiffre d’affaires et gardez une vision claire de votre activité.",
  },
  {
    title: "Votre présence en ligne",
    text: "Avec Nolyo Pro, présentez votre activité et permettez à vos clients de réserver en ligne.",
  },
];

const whyModules = [
  "Clients",
  "Agenda",
  "Relances",
  "Devis",
  "Chiffre d’affaires",
  "Statistiques",
  "Page professionnelle",
];

const steps = [
  {
    n: "01",
    title: "Testez",
    text: "Découvrez Nolyo pendant 5 minutes, sans créer de compte et sans carte bancaire.",
  },
  {
    n: "02",
    title: "Choisissez",
    text: "Essentiel pour gérer votre activité, ou Pro pour gérer, présenter et développer votre activité.",
  },
  {
    n: "03",
    title: "Développez",
    text: "Configurez votre espace et commencez à centraliser votre activité.",
  },
];

const essentielFeatures = [
  "Tableau de bord privé",
  "Fiches clients & historique",
  "Prospects et suivi",
  "Agenda et rendez-vous",
  "Notes et tâches",
  "Chiffre d’affaires, mois par mois",
  "Relances clients",
  "Paiement sécurisé Stripe",
];

const proFeatures = [
  "Tout Nolyo Essentiel",
  "Page professionnelle personnalisée",
  "Réservations en ligne 24h/24",
  "Vos clients réservent sans créer de compte",
  "Demandes de devis en ligne",
  "Ajout au calendrier (Google & Apple)",
  "Congés : fermeture auto de la réservation",
  "QR Code vers votre page",
  "Avis clients modérés",
  "Tableau de bord & statistiques",
  "Dépenses et cotisations",
];

const proFocus = [
  {
    title: "Présentez-vous",
    text: "Votre activité, vos prestations et votre univers.",
  },
  {
    title: "Soyez trouvé",
    text: "Partagez facilement votre page avec un lien ou un QR Code.",
  },
  {
    title: "Soyez réservé",
    text: "Vos clients choisissent directement un créneau disponible.",
  },
];

const audiences = [
  {
    title: "Beauté & bien-être",
    text: "Coiffeurs, esthéticiennes, praticiens, masseurs…",
  },
  {
    title: "Freelances",
    text: "Développeurs, graphistes, consultants…",
  },
  {
    title: "Prestataires",
    text: "Artisans, photographes, services à domicile…",
  },
  {
    title: "Indépendants",
    text: "Toute personne qui souhaite mieux gérer son activité.",
  },
];

const faqItems = [
  {
    q: "Nolyo est-il gratuit ?",
    a: "Le premier mois est offert. Ensuite, vous choisissez votre formule (Essentiel ou Pro) avec un engagement de 6 mois — soit 7 mois au total.",
  },
  {
    q: "Puis-je tester Nolyo sans créer de compte ?",
    a: "Oui. Vous pouvez découvrir l’interface pendant 5 minutes, sans créer de compte ni renseigner votre carte bancaire.",
  },
  {
    q: "Quelle est la différence entre Essentiel et Pro ?",
    a: "Essentiel sert à gérer votre activité en privé (clients, agenda, notes, chiffre d’affaires, relances). Pro ajoute la page professionnelle, la réservation et les devis en ligne, le QR Code, les avis, les statistiques, les congés et le suivi des dépenses.",
  },
  {
    q: "Puis-je changer de formule ?",
    a: "Vous pouvez passer une fois d’Essentiel à Pro depuis votre espace (pendant le mois offert sans surcoût ; ensuite la différence du mois en cours peut être prélevée). Le retour de Pro vers Essentiel n’est pas prévu.",
  },
  {
    q: "Comment fonctionne la réservation en ligne ?",
    a: "Avec Nolyo Pro, vos visiteurs ouvrent votre page publique, choisissent une prestation et un créneau disponible. Le rendez-vous arrive dans votre agenda. Les jours de congés que vous définissez ferment automatiquement la réservation.",
  },
  {
    q: "Nolyo est-il adapté à mon activité ?",
    a: "Nolyo est pensé pour les indépendants et petites structures qui veulent centraliser clients, rendez-vous et suivi d’activité — avec une vitrine en ligne si vous choisissez Pro.",
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-ink/8 last:border-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="font-medium text-ink">{item.q}</span>
        <span
          className={`shrink-0 text-ink-soft transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ⌄
        </span>
      </button>
      {open ? (
        <p className="pb-5 text-sm leading-relaxed text-ink-soft">{item.a}</p>
      ) : null}
    </div>
  );
}

function Stars({ rating }) {
  const filled = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 text-copper" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill={n <= filled ? "currentColor" : "none"}
        >
          <path
            d="M10 2.5l2.2 4.46 4.92.72-3.56 3.47.84 4.9L10 13.74 5.6 16.05l.84-4.9L2.88 7.68l4.92-.72L10 2.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

function formatMembers(count) {
  return new Intl.NumberFormat("fr-FR").format(count);
}

function Reveal({ children, className = "", stagger = false, as: Tag = "div" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-in");
        io.disconnect();
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${stagger ? "home-reveal-stagger" : "home-reveal"} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

function Home() {
  const location = useLocation();
  const [faqOpen, setFaqOpen] = useState(0);
  const [stats, setStats] = useState({ members: null, faces: [] });
  const [avisStats, setAvisStats] = useState({
    rating: reviewStats.rating,
    count: reviewStats.count,
  });
  const [demoPage, setDemoPage] = useState(DEMO_PAGE_FALLBACK);
  const [demoLabel, setDemoLabel] = useState("Maison Brume");

  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    el?.scrollIntoView({ behavior: "smooth" });
  }, [location.hash]);

  useEffect(() => {
    api("/api/public/landing-demo")
      .then((data) => {
        const slug = data.pageSlug || data.user?.page?.slug || "maison-brume";
        setDemoPage(`/p/${slug}`);
        const company =
          data.user?.subscription?.company ||
          data.user?.onboarding?.company ||
          data.user?.name;
        if (company) setDemoLabel(company);
      })
      .catch(() => {
        setDemoPage(DEMO_PAGE_FALLBACK);
        setDemoLabel("Maison Brume");
      });
  }, []);
  useEffect(() => {
    api("/api/public/stats")
      .then((data) =>
        setStats({
          members: Number(data.members) || 0,
          faces: Array.isArray(data.faces) ? data.faces : [],
        }),
      )
      .catch(() => setStats({ members: 0, faces: [] }));
  }, []);

  const members = stats.members;
  const faces = stats.faces;
  const ratingLabel = Number(avisStats.rating || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const priceFrom = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(essentiel?.price || 9.99);

  return (
    <main className="bg-paper">
      {/* 1. Hero */}
      <section
        id="accueil"
        className="dash-sidebar relative flex min-h-[calc(100svh-4.75rem)] flex-col overflow-hidden text-cream"
      >
        <div
          className="home-hero-orb pointer-events-none absolute -top-24 -right-16 h-[28rem] w-[28rem] rounded-full bg-copper/25 blur-3xl"
          aria-hidden
        />
        <div
          className="home-hero-orb-b pointer-events-none absolute bottom-[-20%] left-[-10%] h-[22rem] w-[22rem] rounded-full bg-cream/8 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          <p
            className="home-hero-rise font-display text-sm font-semibold tracking-[0.28em] text-copper uppercase sm:text-base"
            style={{ animationDelay: "0.05s" }}
          >
            Nolyo
          </p>

          <h1 className="mt-6 max-w-3xl">
            <span
              className="home-hero-rise block font-display text-[2rem] leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.15s" }}
            >
              Gérez votre activité.
            </span>
            <span
              className="home-hero-rise mt-2 block font-display text-[1.65rem] leading-[1.15] font-semibold tracking-tight text-cream/90 sm:mt-3 sm:text-4xl lg:text-5xl"
              style={{ animationDelay: "0.28s" }}
            >
              Donnez à vos clients une vraie expérience en ligne.
            </span>
          </h1>

          <div
            className="home-hero-line mt-7 h-px w-24 bg-copper"
            aria-hidden
          />

          <p
            className="home-hero-rise mt-7 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg"
            style={{ animationDelay: "0.42s" }}
          >
            Avec Nolyo, créez votre espace professionnel, présentez vos services
            et permettez à vos clients de prendre rendez-vous en ligne.
          </p>

          <p
            className="home-hero-rise mt-5 text-sm font-medium text-cream/90 sm:text-base"
            style={{ animationDelay: "0.52s" }}
          >
            À partir de {priceFrom} €/mois.
          </p>

          <div
            className="home-hero-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            style={{ animationDelay: "0.62s" }}
          >
            <Link
              to="/#offres"
              className="home-cta-pulse inline-flex items-center justify-center rounded-full bg-copper px-7 py-3.5 text-sm font-semibold text-cream shadow-lg shadow-ink/20 transition hover:bg-copper-dark hover:shadow-xl"
            >
              Découvrir Nolyo
            </Link>
            <TryPreviewButton plan="pro" variant="ghost" className="justify-center">
              Essayer 5 min
            </TryPreviewButton>
          </div>

          <p
            className="home-hero-rise mt-12 max-w-2xl font-display text-xl leading-snug tracking-tight text-cream sm:text-2xl lg:text-3xl"
            style={{ animationDelay: "0.78s" }}
          >
            Votre gestion + votre page professionnelle + vos rendez-vous en
            ligne.
          </p>
        </div>

        <div
          className="home-hero-fade relative mx-auto w-full max-w-6xl px-5 pb-10 sm:px-8"
          style={{ animationDelay: "0.95s" }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-[1.35rem] bg-cream/12 px-5 py-4 ring-1 ring-cream/12 backdrop-blur-sm">
              {faces.length > 0 ? (
                <div className="flex -space-x-2.5">
                  {faces.map((face) =>
                    face.avatar ? (
                      <img
                        key={`${face.name}-${face.avatar}`}
                        src={mediaUrl(face.avatar)}
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
                  {members === null ? "…" : formatMembers(members)}
                </p>
                <p className="text-sm text-cream/65">
                  {members === 1
                    ? "indépendant sur Nolyo"
                    : "indépendants sur Nolyo"}
                </p>
              </div>
            </div>
            <Link
              to="/#avis"
              className="flex items-center justify-between gap-4 rounded-[1.35rem] bg-cream px-5 py-4 text-ink shadow-lg shadow-ink/10 ring-1 ring-cream/80 transition hover:-translate-y-0.5"
            >
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">
                  Avis
                </p>
                <p className="mt-1 font-display text-3xl tracking-tight">
                  {ratingLabel}
                  <span className="ml-1 text-base font-sans font-medium text-ink-soft">
                    / 5
                  </span>
                </p>
              </div>
              <div className="text-right">
                <Stars rating={avisStats.rating} />
                <p className="mt-1 text-sm text-ink-soft">
                  {avisStats.count} avis
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Constat */}
      <section id="constat" className="border-b border-ink/6">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
              Le constat
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Votre activité ne devrait pas être éparpillée partout.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Instagram pour les demandes. WhatsApp pour les clients. Google
              Agenda pour les rendez-vous. Excel pour suivre votre chiffre
              d’affaires. Et encore un autre outil pour votre présence en ligne.
            </p>
            <p className="mt-5 font-display text-2xl tracking-tight text-moss sm:text-3xl">
              Nolyo rassemble l’essentiel au même endroit.
            </p>
          </Reveal>
          <Reveal stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {constatCards.map((item) => (
              <article
                key={item.title}
                className="home-reveal-item rounded-[1.35rem] bg-cream p-5 ring-1 ring-ink/6 transition hover:-translate-y-1 hover:ring-ink/12"
              >
                <h3 className="font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.text}
                </p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 3. Pourquoi Nolyo */}
      <section
        id="pourquoi"
        className="border-b border-ink/6 bg-moss text-cream"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
              Pourquoi Nolyo
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Un seul espace pour votre activité.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-cream/75">
              Nolyo est pensé pour éviter de multiplier les outils et vous
              permettre de retrouver l’essentiel au même endroit.
            </p>
          </Reveal>

          <Reveal className="home-preview-wrap mt-10 min-w-0 sm:mt-12">
            <LiveAppFrame
              src={DEMO_DASHBOARD}
              title={`Tableau de bord Nolyo — ${demoLabel}`}
            />
          </Reveal>

          <Reveal className="home-chip-stagger mt-10">
            <div className="flex flex-wrap gap-2.5">
              {whyModules.map((label) => (
                <span
                  key={label}
                  className="home-chip rounded-full bg-cream/10 px-4 py-2 text-sm text-cream ring-1 ring-cream/15 transition hover:bg-cream/16"
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-10 font-display text-3xl tracking-tight sm:text-4xl">
              Moins d’onglets. Moins de bricolage. Plus de clarté.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 4. Comment ça marche */}
      <section
        id="fonctionnement"
        className="border-b border-ink/6 bg-paper-2/70"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
              Comment ça marche
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Simple à prendre en main. Pensé pour votre quotidien.
            </h2>
          </Reveal>
          <Reveal stagger className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.n}
                className="home-reveal-item rounded-[1.5rem] bg-cream p-6 ring-1 ring-ink/6 transition hover:-translate-y-1"
              >
                <p className="font-display text-sm text-copper">{step.n}</p>
                <h3 className="mt-3 font-display text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {step.text}
                </p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 6. Essentiel vs Pro */}
      <section id="offres" className="border-b border-ink/6">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
              Tarifs
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Deux formules. Une seule idée : vous simplifier la vie.
            </h2>
            <p className="mt-4 text-base text-ink-soft">
              Premier mois offert. Ensuite, engagement de 6 mois — 7 mois au
              total.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <article className="flex flex-col rounded-[1.6rem] bg-cream p-7 ring-1 ring-ink/10 sm:p-8">
              <span className="w-fit rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-cream">
                Gestion privée
              </span>
              <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-moss-mid uppercase">
                Essentiel
              </p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {new Intl.NumberFormat("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(essentiel?.price || 9.99)}
                <span className="ml-1.5 text-lg font-sans font-medium text-ink-soft">
                  € / mois
                </span>
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                1er mois offert · Engagement 6 mois · 0 % de commission
              </p>
              <ul className="mt-7 flex-1 divide-y divide-ink/8">
                {essentielFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 py-3 text-sm text-ink"
                  >
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-moss/10 text-moss"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-center text-xs text-ink-soft">
                Essai 5 min gratuit · Sans carte bancaire
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <TryPreviewButton
                  plan="essentiel"
                  variant="header"
                  className="w-full justify-center !rounded-2xl !py-3.5"
                >
                  Tester gratuitement →
                </TryPreviewButton>
                <Link
                  to="/abonnement?plan=essentiel"
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-ink ring-1 ring-ink/12 transition hover:bg-ink/5"
                >
                  Demander Essentiel
                </Link>
              </div>
            </article>

            <article className="relative flex flex-col rounded-[1.6rem] bg-moss p-7 text-cream shadow-xl shadow-moss/20 ring-1 ring-moss sm:p-8">
              <span className="w-fit rounded-full bg-cream px-3 py-1 text-[11px] font-semibold text-ink">
                Tout inclus
              </span>
              <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-copper uppercase">
                Pro
              </p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {new Intl.NumberFormat("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(pro?.price || 19.99)}
                <span className="ml-1.5 text-lg font-sans font-medium text-cream/65">
                  € / mois
                </span>
              </p>
              <p className="mt-2 text-sm text-cream/70">
                1er mois offert · Engagement 6 mois · 0 % de commission
              </p>
              <ul className="mt-7 flex-1 divide-y divide-cream/12">
                {proFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 py-3 text-sm text-cream/92"
                  >
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cream/12 text-cream"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-center text-xs text-cream/65">
                Essai 5 min gratuit · Sans carte bancaire
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <TryPreviewButton
                  plan="pro"
                  className="w-full justify-center !rounded-2xl !bg-cream !py-3.5 !text-ink !shadow-none hover:!bg-paper"
                >
                  Tester gratuitement →
                </TryPreviewButton>
                <Link
                  to="/abonnement?plan=pro"
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-cream ring-1 ring-cream/25 transition hover:bg-cream/10"
                >
                  Demander Pro
                </Link>
              </div>
            </article>
          </div>

          <div className="mt-8 rounded-[1.35rem] bg-paper-2/80 px-6 py-5 ring-1 ring-ink/6">
            <p className="text-sm font-medium text-ink">Premier mois offert</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
              Après le mois offert, l’abonnement est souscrit pour 6 mois. Soit
              7 mois au total.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Focus Pro */}
      <section id="pro" className="border-b border-ink/6 bg-cream/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
              Nolyo Pro
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Votre activité mérite plus qu’un simple profil Instagram.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Avec Nolyo Pro, créez votre page professionnelle pour présenter
              votre activité, vos prestations et permettre à vos clients de vous
              contacter ou de réserver en ligne.
            </p>
          </Reveal>

          <Reveal className="home-preview-wrap mt-10 min-w-0 sm:mt-12">
            <LiveAppFrame
              src={demoPage}
              title={`nolyo.fr${demoPage}`}
            />
          </Reveal>

          <Reveal stagger className="mt-12 grid gap-6 sm:grid-cols-3">
            {proFocus.map((item) => (
              <article
                key={item.title}
                className="home-reveal-item rounded-[1.35rem] bg-cream p-5 ring-1 ring-ink/6"
              >
                <h3 className="font-display text-2xl tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {item.text}
                </p>
              </article>
            ))}
          </Reveal>

          <Reveal className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">
              Exemple réel : la page publique du compte démo{" "}
              <span className="font-medium text-ink">{demoLabel}</span>.
            </p>
            <div className="flex flex-wrap gap-3">
              <TryPreviewButton plan="pro" variant="header">
                Découvrir Nolyo Pro
              </TryPreviewButton>
              <Link
                to={demoPage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-ink/12 transition hover:bg-ink/5"
              >
                Voir la page démo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8. Pour qui */}
      <section id="pour-qui" className="border-b border-ink/6">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
              Pour qui
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Nolyo s’adapte à votre activité.
            </h2>
          </Reveal>
          <Reveal stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((item) => (
              <article
                key={item.title}
                className="home-reveal-item rounded-[1.35rem] bg-cream p-5 ring-1 ring-ink/6 transition hover:-translate-y-1"
              >
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.text}
                </p>
              </article>
            ))}
          </Reveal>
          <Reveal className="mt-10">
            <p className="font-display text-2xl tracking-tight text-moss sm:text-3xl">
              Vous êtes indépendant ? Nolyo est fait pour vous.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 9. Philosophie */}
      <section id="philosophie" className="border-b border-ink/6 bg-paper-2">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-24">
          <Reveal>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
              Philosophie
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Moins d’outils. Plus de clarté.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-ink-soft sm:text-lg">
              Nolyo est né d’une idée simple : un indépendant ne devrait pas avoir
              besoin de cinq outils différents pour gérer son activité.
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
              Nous voulons créer un outil simple, accessible et réellement pensé
              pour les personnes qui travaillent seules.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 10. Témoignages */}
      <TestimonialsCarousel onStats={setAvisStats} />

      {/* 11. FAQ */}
      <section id="faq" className="border-b border-ink/6">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-24">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Questions fréquentes
          </h2>
          <div className="mt-10 rounded-[1.5rem] bg-cream px-5 ring-1 ring-ink/6 sm:px-7">
            {faqItems.map((item, index) => (
              <FaqItem
                key={item.q}
                item={item}
                open={faqOpen === index}
                onToggle={() =>
                  setFaqOpen((current) => (current === index ? -1 : index))
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* 12. CTA final */}
      <section id="commencer" className="px-5 py-20 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-[1.5rem] bg-moss px-5 py-10 text-cream sm:px-12 sm:py-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Votre activité. Un seul espace.
            </h2>
            <p className="mt-3 max-w-lg text-cream/80">
              Clients, rendez-vous, chiffre d’affaires, relances et présence en
              ligne : gérez l’essentiel avec Nolyo.
            </p>
            <p className="mt-4 text-sm text-cream/70">🎁 Premier mois offert</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              to="/#offres"
              className="inline-flex items-center justify-center rounded-full bg-copper px-7 py-3.5 text-sm font-semibold text-cream transition hover:bg-copper-dark"
            >
              Découvrir Nolyo
            </Link>
            <TryPreviewButton
              plan="pro"
              variant="ghost"
              className="justify-center"
            >
              Tester gratuitement
            </TryPreviewButton>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
