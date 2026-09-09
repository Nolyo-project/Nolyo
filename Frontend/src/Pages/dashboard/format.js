import { useEffect, useState } from 'react'

export const fieldClass =
  'mt-1.5 w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-sm outline-none transition focus:border-copper focus:ring-2 focus:ring-copper/15'

export function formatMoney(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value || 0)
}

export function formatDay(value) {
  if (value == null || value === '') return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatLongDate(value = new Date()) {
  const raw = new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(value) {
  return `${formatDay(value)} · ${formatTime(value)}`
}

export function toDatetimeLocal(value) {
  const date = value ? new Date(value) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function trialDaysLeft(activatedAt, durationDays = 30, trialEndsAt) {
  const end = trialEndsAt ? new Date(trialEndsAt) : activatedAt ? new Date(activatedAt) : null
  if (!end || Number.isNaN(end.getTime())) return 0
  if (!trialEndsAt && activatedAt) {
    end.setDate(end.getDate() + durationDays)
    end.setHours(23, 59, 59, 999)
  }
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

export function toDateInput(value) {
  const date = value ? new Date(value) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function monthKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function shiftMonthKey(key, delta) {
  const [year, month] = String(key).split('-').map(Number)
  return monthKey(new Date(year, month - 1 + delta, 1))
}

export function formatMonthLabel(key) {
  const [year, month] = String(key).split('-').map(Number)
  const raw = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function dateInMonth(key) {
  return monthKey() === key ? toDateInput() : `${key}-01`
}

export function monthInputBounds(key) {
  const [year, month] = String(key).split('-').map(Number)
  const last = new Date(year, month, 0).getDate()
  const pad = (n) => String(n).padStart(2, '0')
  return { min: `${key}-01`, max: `${key}-${pad(last)}` }
}

export const WEEKDAY_LABELS = [
  { key: 1, short: 'Lun', long: 'Lundi' },
  { key: 2, short: 'Mar', long: 'Mardi' },
  { key: 3, short: 'Mer', long: 'Mercredi' },
  { key: 4, short: 'Jeu', long: 'Jeudi' },
  { key: 5, short: 'Ven', long: 'Vendredi' },
  { key: 6, short: 'Sam', long: 'Samedi' },
  { key: 0, short: 'Dim', long: 'Dimanche' },
]

export function defaultSchedule() {
  return {
    workStart: '09:00',
    workEnd: '18:00',
    durationMinutes: 60,
    workDays: [1, 2, 3, 4, 5],
  }
}

export function parseLocalDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function startOfWeek(value = new Date()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  return date
}

export function addDays(value, amount) {
  const date = new Date(value)
  date.setDate(date.getDate() + amount)
  return date
}

function parseMinutes(hhmm) {
  const [hours, minutes] = String(hhmm || '09:00').split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export function formatMinutes(total) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function buildDaySlots(workStart, workEnd, durationMinutes) {
  const start = parseMinutes(workStart)
  const end = parseMinutes(workEnd)
  const duration = Number(durationMinutes) || 60
  const slots = []
  if (duration <= 0 || start >= end) return slots
  for (let time = start; time + duration <= end; time += duration) {
    slots.push({ startMinutes: time, label: formatMinutes(time) })
  }
  return slots
}

export function slotDateTime(day, startMinutes) {
  const date = new Date(day)
  date.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
  return date
}

export function appointmentOverlaps(appointment, slotStart, durationMinutes) {
  if (!appointment || appointment.status !== 'planned') return false
  const start = new Date(appointment.startAt).getTime()
  const end = start + (appointment.durationMinutes || durationMinutes || 60) * 60000
  const slotEnd = slotStart.getTime() + durationMinutes * 60000
  return start < slotEnd && end > slotStart.getTime()
}

export function appointmentSlotSpan(appointment, slotDurationMinutes, remainingSlots = 1) {
  const slot = Number(slotDurationMinutes) || 60
  const duration = Number(appointment?.durationMinutes) || slot
  const span = Math.max(1, Math.ceil(duration / slot))
  return Math.min(span, Math.max(1, remainingSlots))
}

export function localDateTimeIso(dateValue, timeValue) {
  const day = parseLocalDate(dateValue)
  if (!day || !timeValue) return null
  const [hours, minutes] = String(timeValue).split(':').map(Number)
  return slotDateTime(day, hours * 60 + (minutes || 0)).toISOString()
}

export function isSlotInFuture(start, now = Date.now()) {
  return new Date(start).getTime() > now
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export const DEFAULT_DEPOSIT_PLAN = [
  { label: 'Acompte', percent: 30 },
  { label: 'Solde', percent: 70 },
]

export const DEPOSIT_TEMPLATES = [
  {
    id: '30-70',
    label: '30 / 70',
    hint: 'Le plus courant',
    steps: [
      { label: 'Acompte', percent: 30 },
      { label: 'Solde', percent: 70 },
    ],
  },
  {
    id: '40-60',
    label: '40 / 60',
    hint: 'À la commande',
    steps: [
      { label: 'Acompte', percent: 40 },
      { label: 'Solde', percent: 60 },
    ],
  },
  {
    id: '50-50',
    label: '50 / 50',
    hint: 'Moitié-moitié',
    steps: [
      { label: 'Acompte', percent: 50 },
      { label: 'Solde', percent: 50 },
    ],
  },
  {
    id: '30-40-30',
    label: '30 / 40 / 30',
    hint: 'Trois temps',
    steps: [
      { label: 'Commande', percent: 30 },
      { label: 'Avancement', percent: 40 },
      { label: 'Livraison', percent: 30 },
    ],
  },
]

export function normalizeDepositPlan(value) {
  if (!Array.isArray(value) || !value.length) return DEFAULT_DEPOSIT_PLAN.map((step) => ({ ...step, paid: false }))
  return value.slice(0, 6).map((step, index, list) => {
    const percent = Math.min(100, Math.max(0, Math.round(Number(step?.percent) || 0)))
    const label = String(step?.label || '').trim()
    return {
      label: label || (index === 0 ? 'Acompte' : index === list.length - 1 ? 'Solde' : `Échéance ${index + 1}`),
      percent,
      paid: Boolean(step?.paid),
      paidAt: step?.paidAt || undefined,
      transaction: step?.transaction || undefined,
    }
  })
}

export function depositPercentsKey(steps) {
  return normalizeDepositPlan(steps)
    .map((step) => step.percent)
    .join('-')
}

export function depositPlanTotal(steps) {
  return normalizeDepositPlan(steps).reduce((sum, step) => sum + step.percent, 0)
}

export function splitDepositAmounts(price, steps) {
  const plan = normalizeDepositPlan(steps)
  const cents = Math.round((Number(price) || 0) * 100)
  let allocated = 0
  return plan.map((step, index) => {
    const amountCents =
      index === plan.length - 1 ? Math.max(0, cents - allocated) : Math.round((cents * step.percent) / 100)
    allocated += amountCents
    return { ...step, amount: amountCents / 100 }
  })
}

export function unpaidDeposits(price, steps) {
  if (!(Number(price) > 0)) return []
  return splitDepositAmounts(price, steps).filter((step) => step.amount > 0 && !step.paid)
}

export function depositProgress(price, steps) {
  const due = splitDepositAmounts(price, steps).filter((step) => step.amount > 0)
  return {
    paid: due.filter((step) => step.paid).length,
    total: due.length,
  }
}

export function resolveQuoteStatus(contact) {
  if (contact?.quoteStatus === 'sent' || contact?.quoteStatus === 'signed') return contact.quoteStatus
  if ((contact?.depositPlan || []).some((step) => step.paid)) return 'signed'
  return 'none'
}

export function dealStage(contact, userPlan) {
  if (contact?.jobStatus === 'done') return { key: 'done', label: 'Terminé' }
  if (contact?.jobStatus === 'archived') return { key: 'archived', label: 'Sans suite' }
  const quote = resolveQuoteStatus(contact)
  if (quote === 'none') return { key: 'quote', label: 'Devis à envoyer' }
  if (quote === 'sent') return { key: 'sent', label: 'Devis envoyé' }
  const due = splitDepositAmounts(contact.price, contact.depositPlan?.length ? contact.depositPlan : userPlan).filter(
    (step) => step.amount > 0,
  )
  const unpaid = due.filter((step) => !step.paid)
  if (unpaid.length) {
    return { key: 'payment', label: `${unpaid[0].label} à encaisser` }
  }
  return { key: 'ready', label: 'Prêt à terminer' }
}
