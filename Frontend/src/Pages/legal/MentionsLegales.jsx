import { Link } from 'react-router-dom'

function MentionsLegales() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-semibold tracking-[0.2em] text-copper uppercase">Légal</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-5xl">Mentions légales</h1>

      <section className="mt-8 space-y-6 rounded-3xl bg-cream p-6 ring-1 ring-ink/8 sm:p-8">
        <article>
          <h2 className="font-display text-2xl">Éditeur du site</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Nolyo — solution SaaS pour indépendants.
            <br />
            Contact :{' '}
            <a href="mailto:support.nolyo@gmail.com" className="underline decoration-copper/40">
              support.nolyo@gmail.com
            </a>
            .
            <br />
            Site :{' '}
            <a href="https://nolyo.fr" className="underline decoration-copper/40" target="_blank" rel="noreferrer">
              https://nolyo.fr
            </a>
            .
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            À compléter avant mise en production : dénomination sociale, forme juridique, adresse, SIREN/SIRET, n° TVA
            intracommunautaire, capital social.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">Hébergement</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            L’infrastructure est hébergée par des prestataires cloud et techniques sélectionnés par Nolyo (application,
            base de données, envoi e-mail, paiement).
          </p>
          <p className="mt-3 text-xs text-ink-soft">À compléter : raison sociale et adresse postale de l’hébergeur principal.</p>
        </article>

        <article>
          <h2 className="font-display text-2xl">Propriété intellectuelle</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            La marque Nolyo, son identité visuelle, ses contenus et son code sont protégés. Toute reproduction,
            extraction ou utilisation non autorisée est interdite.
          </p>
        </article>

        <article>
          <h2 className="font-display text-2xl">Responsabilité</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Nolyo met en œuvre tous les moyens raisonnables pour assurer la fiabilité du service, sans garantir
            l’absence totale d’interruption. L’utilisateur reste responsable des informations qu’il renseigne dans son
            espace.
          </p>
        </article>
      </section>

      <p className="mt-8 text-sm text-ink-soft">
        Voir aussi : <Link className="underline" to="/cgv">CGV</Link> ·{' '}
        <Link className="underline" to="/politique-confidentialite">Politique de confidentialité</Link>
      </p>
    </main>
  )
}

export default MentionsLegales
