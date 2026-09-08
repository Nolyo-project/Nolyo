import { MailMenu } from './MailMenu'
import { formatDateTime, resolveQuoteStatus } from './format'
import { ghostBtn, primaryBtn } from './ui'

function quoteBody(name) {
  return `Bonjour${name ? ` ${name}` : ''},\n\nVeuillez trouver ci-joint mon devis.\n\nBien cordialement`
}

export function DealFollow({ contact, email, name, canEdit, pending, onQuote }) {
  const quote = resolveQuoteStatus(contact)
  const steps = [
    { key: 'sent', label: 'Devis envoyé', done: quote === 'sent' || quote === 'signed' },
    { key: 'signed', label: 'Devis signé', done: quote === 'signed' },
  ]

  return (
    <div className="rounded-[1.6rem] bg-cream p-5 sm:p-6">
      <p className="text-sm font-medium">Suivi du dossier</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Composez le montant avec vos prestations, faites le devis sur votre plateforme de facturation, envoyez-le, puis
        marquez-le ici.
      </p>
      <ol className="mt-4 flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              step.done ? 'bg-moss text-cream' : 'bg-paper text-ink-soft ring-1 ring-ink/8'
            }`}
          >
            <span>{index + 1}</span>
            {step.label}
          </li>
        ))}
      </ol>

      {email ? (
        <p className="mt-4 text-sm text-ink-soft">
          Cliquez l’e-mail pour ouvrir Gmail ou Outlook et envoyer le devis :{' '}
          <MailMenu
            email={email}
            name={name}
            subject={name ? `Devis — ${name}` : 'Devis'}
            body={quoteBody(name)}
            onPicked={() => {
              if (canEdit && quote === 'none') onQuote?.('sent')
            }}
          >
            {email}
          </MailMenu>
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">Ajoutez un e-mail pour envoyer le devis en un clic.</p>
      )}

      {contact?.quoteSentAt && quote !== 'none' ? (
        <p className="mt-2 text-xs text-ink-soft">
          Envoyé le {formatDateTime(contact.quoteSentAt)}
          {contact.quoteSignedAt ? ` · signé le ${formatDateTime(contact.quoteSignedAt)}` : ''}
        </p>
      ) : null}

      {canEdit && quote === 'none' ? (
        <button type="button" disabled={pending} onClick={() => onQuote?.('sent')} className={`${ghostBtn} mt-4`}>
          J’ai envoyé le devis
        </button>
      ) : null}
      {canEdit && quote === 'sent' ? (
        <button type="button" disabled={pending} onClick={() => onQuote?.('signed')} className={`${primaryBtn} mt-4`}>
          Le devis est signé
        </button>
      ) : null}
      {canEdit && quote === 'signed' ? (
        <p className="mt-4 text-sm font-medium text-moss">Devis signé. Vous pouvez encaisser les acomptes.</p>
      ) : null}
    </div>
  )
}

export function stageTone(key) {
  if (key === 'ready' || key === 'done') return 'bg-moss/10 text-moss'
  if (key === 'payment') return 'bg-moss/10 text-moss'
  if (key === 'archived') return 'bg-ink/8 text-ink-soft'
  return 'bg-copper/10 text-copper'
}
