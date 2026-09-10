import { Link } from 'react-router-dom'

function PolitiqueConfidentialite() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-semibold tracking-[0.2em] text-copper uppercase">Légal</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-5xl">Politique de confidentialité</h1>
      <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft ring-1 ring-ink/8">
        Dernière mise à jour : 9 septembre 2026.
      </p>

      <section className="mt-8 space-y-6 rounded-3xl bg-cream p-6 ring-1 ring-ink/8 sm:p-8">
        <article>
          <h2 className="font-display text-2xl">1. Données collectées</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Nolyo collecte les données nécessaires à la création de compte, au suivi client, à la facturation et au
            support (identité, e-mail, informations d’activité, usage de la plateforme).
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">2. Finalités</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Les traitements servent à : fournir le service Nolyo, sécuriser les accès, gérer la relation commerciale,
            produire des statistiques internes, améliorer l’expérience utilisateur et respecter les obligations légales.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">3. Base légale</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Les traitements reposent sur l’exécution du contrat, l’intérêt légitime de l’éditeur, le consentement
            (lorsqu’il est requis) et les obligations légales applicables.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">4. Durée de conservation</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Les données sont conservées pendant la durée nécessaire au service, puis archivées ou supprimées selon les
            contraintes légales, comptables et de sécurité.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">5. Destinataires</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Les données peuvent être traitées par les équipes Nolyo et des sous-traitants techniques (hébergement,
            e-mails, paiement Stripe), strictement pour les finalités prévues.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">6. Vos droits</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Vous pouvez demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos
            données, ainsi que vous opposer à certains traitements, en écrivant à{' '}
            <a href="mailto:support.nolyo@gmail.com" className="underline decoration-copper/40">
              support.nolyo@gmail.com
            </a>
            .
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">7. Cookies et mesure d’audience</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Nolyo utilise des cookies techniques nécessaires au fonctionnement du site, et peut utiliser des outils de
            mesure d’audience (ex. Google Analytics) pour analyser le trafic de façon agrégée.
          </p>
        </article>
      </section>

      <p className="mt-8 text-sm text-ink-soft">
        Voir aussi : <Link className="underline" to="/mentions-legales">Mentions légales</Link> ·{' '}
        <Link className="underline" to="/cgv">CGV</Link>
      </p>
    </main>
  )
}

export default PolitiqueConfidentialite
