import { planLabels } from '../../data/plans'

export const statusLabels = {
  received: 'Nouvelle',
  quote_sent: 'Devis envoyé',
  paid: 'Devis signé',
  code_issued: 'Code prêt',
  registered: 'Inscrit',
}

export const statusHint = {
  received: 'Ouvrir Gmail, joindre le devis, envoyer',
  quote_sent: 'En attente du devis signé',
  paid: 'Code envoyé',
  code_issued: 'À transmettre au client',
  registered: 'Espace ouvert · mois offert',
}

export const deletionLabels = {
  pending: 'À traiter',
  accepted: 'Compte fermé',
  refused: 'Refusée',
}

export const pipeline = [
  ['received', 'Les demandes'],
  ['quote_sent', 'Devis'],
  ['code_issued', 'Code'],
  ['registered', 'Inscrits'],
]

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDay(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function matchesQuery(haystack, query) {
  if (!query) return true
  return String(haystack || '')
    .toLowerCase()
    .includes(query)
}

export function Stat({ label, value, hint, onClick, tone = 'light' }) {
  const className = `rounded-[1.35rem] p-4 text-left ring-1 ${
    tone === 'dark' ? 'bg-moss text-cream ring-moss' : 'bg-cream text-ink ring-ink/6'
  } ${onClick ? 'transition hover:-translate-y-0.5' : ''}`
  const inner = (
    <>
      <p className={`text-[11px] font-semibold tracking-[0.16em] uppercase ${tone === 'dark' ? 'text-cream/55' : 'text-ink-soft'}`}>
        {label}
      </p>
      <p className="mt-2 font-display text-3xl tracking-tight">{value}</p>
      {hint ? <p className={`mt-1 text-sm ${tone === 'dark' ? 'text-cream/70' : 'text-ink-soft'}`}>{hint}</p> : null}
    </>
  )
  if (!onClick) return <article className={className}>{inner}</article>
  return (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  )
}

export function Empty({ children }) {
  return (
    <div className="rounded-3xl border border-dashed border-ink/12 bg-cream/40 px-6 py-12 text-center text-sm text-ink-soft">
      {children}
    </div>
  )
}

export function Pill({ children, tone = 'paper' }) {
  const tones = {
    paper: 'bg-paper text-ink',
    moss: 'bg-moss text-cream',
    copper: 'bg-copper text-cream',
    soft: 'bg-moss/10 text-moss',
    alert: 'bg-red-50 text-red-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone] || tones.paper}`}>
      {children}
    </span>
  )
}

export function navClass(active) {
  return `flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
    active ? 'bg-cream font-medium text-moss shadow-sm' : 'text-cream/72 hover:bg-cream/8 hover:text-cream'
  }`
}

export function PipelineBar({ status }) {
  const normalized = status === 'paid' ? 'code_issued' : status
  const current = pipeline.findIndex((step) => step[0] === normalized)
  return (
    <ol className="grid grid-cols-4 gap-1">
      {pipeline.map(([id, label], index) => {
        const done = index <= current
        const here = index === current
        return (
          <li key={id} className="text-center">
            <span className={`mx-auto block h-1.5 rounded-full ${here ? 'bg-copper' : done ? 'bg-moss' : 'bg-ink/10'}`} />
            <span className={`mt-2 block text-[9px] leading-tight sm:text-[10px] ${here ? 'font-semibold text-copper' : done ? 'text-ink' : 'text-ink-soft'}`}>
              {label.replace('Les ', '')}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function planName(plan) {
  return planLabels[plan] || plan || '—'
}

export function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }
}

export function joinName(firstName, lastName) {
  return [firstName, lastName].map((part) => String(part || '').trim()).filter(Boolean).join(' ')
}
