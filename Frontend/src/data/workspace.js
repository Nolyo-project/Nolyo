import { isProPlan } from './plans'

export const MODULES = [
  { id: 'appointments', label: 'Agenda', hint: 'Créneaux et rendez-vous.', plan: 'essentiel', settings: 'Prestations' },
  { id: 'prospects', label: 'Prospects', hint: 'Les personnes à démarcher, avant qu’elles deviennent clientes.', plan: 'essentiel' },
  { id: 'quotes', label: 'Devis', hint: 'Suivi envoyé / signé, avant d’encaisser.', plan: 'essentiel', settings: 'Relances après devis' },
  { id: 'deposits', label: 'Acomptes', hint: 'Un acompte, puis le solde. Inutile si l’on encaisse à la séance.', plan: 'essentiel', settings: 'Répartition des acomptes' },
  { id: 'tasks', label: 'Tâches', hint: 'La to-do du jour et du mois.', plan: 'essentiel' },
  { id: 'notes', label: 'Notes', hint: 'Idées et mémos, liés aux fiches.', plan: 'essentiel' },
  { id: 'finances', label: 'Chiffre d’affaires', hint: 'Ce qui rentre, ce qui sort.', plan: 'essentiel' },
  { id: 'reminders', label: 'Relances', hint: 'Ce qui attend une réponse.', plan: 'essentiel' },
  { id: 'page', label: 'Page professionnelle', hint: 'Votre vitrine publique, la réservation, et une demande de devis sur rendez-vous.', plan: 'pro', settings: 'Menu Page' },
  { id: 'qr', label: 'QR Code', hint: 'Un scan vers votre page.', plan: 'pro' },
  { id: 'inbox', label: 'Boîte de réception', hint: 'Messages Instagram, Facebook et e-mail.', plan: 'pro' },
  { id: 'stats', label: 'Statistiques', hint: 'Une lecture plus fine de l’activité.', plan: 'pro' },
]

const BASE = {
  appointments: true,
  prospects: true,
  quotes: true,
  deposits: true,
  tasks: true,
  notes: true,
  finances: true,
  reminders: true,
}

const TRADE_MODULES = {
  wellness: { ...BASE, prospects: false, quotes: false, reminders: false, deposits: false },
  beauty: { ...BASE, prospects: false, quotes: false, reminders: false, deposits: false },
  health: { ...BASE, prospects: false, quotes: false, reminders: false, deposits: false },
  creative: { ...BASE },
  craft: { ...BASE },
  coaching: { ...BASE },
  consulting: { ...BASE },
  other: { ...BASE },
}

export function tradeModules(tradeId, workMode) {
  const modules = { ...(TRADE_MODULES[tradeId] || TRADE_MODULES.other) }
  if (workMode === 'projects') {
    modules.prospects = true
    modules.quotes = true
    modules.deposits = true
  }
  if (workMode === 'appointments') modules.appointments = true
  return modules
}

export function workspaceForUser(user) {
  const defaults = tradeModules(user?.onboarding?.trade, user?.onboarding?.workMode)
  const incoming = user?.workspace?.modules || {}
  const modules = { ...defaults, ...incoming }
  if (!isProPlan(user)) {
    modules.page = false
    modules.qr = false
    modules.inbox = false
    modules.stats = false
  } else {
    if (incoming.page === undefined) modules.page = true
    if (incoming.qr === undefined) modules.qr = true
    if (incoming.inbox === undefined) modules.inbox = true
    if (incoming.stats === undefined) modules.stats = true
  }
  return {
    displayAs: user?.workspace?.displayAs === 'person' ? 'person' : 'company',
    modules,
  }
}

export function hasModule(user, id) {
  return Boolean(workspaceForUser(user).modules[id])
}

const PRO_TEASERS = new Set(['page', 'qr', 'inbox', 'stats'])

export function canVisitModule(user, id) {
  if (hasModule(user, id)) return true
  return PRO_TEASERS.has(id) && !isProPlan(user)
}

export function workspaceLabel(user) {
  const as = workspaceForUser(user).displayAs
  if (as === 'person') return user?.name || ''
  return user?.subscription?.company || user?.business?.tradeName || user?.onboarding?.company || user?.name || ''
}
