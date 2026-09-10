import { Link } from 'react-router-dom'

function Cgv() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-semibold tracking-[0.2em] text-copper uppercase">Légal</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-5xl">Conditions générales de vente (CGV)</h1>
      <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft ring-1 ring-ink/8">
        Dernière mise à jour : 9 septembre 2026. Ce document est une base solide pour le lancement et doit être validé
        par votre conseil juridique avant publication définitive.
      </p>

      <section className="mt-8 space-y-6 rounded-3xl bg-cream p-6 ring-1 ring-ink/8 sm:p-8">
        <article>
          <h2 className="font-display text-2xl">1. Objet</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Les présentes CGV définissent les conditions d’abonnement et d’utilisation de la plateforme Nolyo proposée
            aux professionnels indépendants (ci-après « le Client »).
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">2. Offres et prix</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Nolyo propose deux offres : Essentiel (9,99 € / mois) et Pro (19,99 € / mois), avec premier mois offert
            puis engagement de 6 mois. Les prix sont indiqués en euros TTC sauf mention contraire.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">3. Commande et activation</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            L’abonnement devient effectif après validation de la demande, signature du devis, puis activation via code
            unique. Le Client garantit l’exactitude des informations transmises lors de l’inscription.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">4. Paiement</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Le paiement est géré par Stripe. En cas d’impayé, l’accès peut être suspendu jusqu’au règlement. En cas de
            passage Essentiel vers Pro hors période offerte, la différence de tarif du mois en cours peut être facturée
            immédiatement selon les règles de proratisation.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">5. Durée, renouvellement, résiliation</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            L’abonnement est conclu pour la période indiquée au devis et se renouvelle selon les modalités prévues. La
            résiliation intervient selon les conditions contractuelles applicables et n’ouvre pas droit au
            remboursement des périodes déjà facturées, sauf disposition légale contraire.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">6. Disponibilité du service</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Nolyo s’engage à fournir un service accessible en continu, sous réserve des opérations de maintenance,
            contraintes techniques ou cas de force majeure.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">7. Responsabilité</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Nolyo est tenu à une obligation de moyens. Le Client reste responsable de l’usage qu’il fait des données,
            contenus et communications qu’il envoie via la plateforme.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">8. Contact</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Pour toute question sur la facturation ou le contrat :{' '}
            <a href="mailto:support.nolyo@gmail.com" className="underline decoration-copper/40">
              support.nolyo@gmail.com
            </a>
            .
          </p>
        </article>
      </section>

      <p className="mt-8 text-sm text-ink-soft">
        Voir aussi : <Link className="underline" to="/mentions-legales">Mentions légales</Link> ·{' '}
        <Link className="underline" to="/politique-confidentialite">Politique de confidentialité</Link>
      </p>
    </main>
  )
}

export default Cgv
