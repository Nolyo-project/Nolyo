const { getTrade } = require('./trades')

const ESSENTIEL_MODULES = ['appointments', 'prospects', 'quotes', 'deposits', 'tasks', 'notes', 'finances', 'reminders']
const PRO_MODULES = ['page', 'qr', 'inbox', 'stats']
const MODULE_IDS = [...ESSENTIEL_MODULES, ...PRO_MODULES]

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

function tradeModules(tradeId, workMode) {
  const modules = { ...(TRADE_MODULES[tradeId] || TRADE_MODULES.other) }
  if (workMode === 'projects') {
    modules.prospects = true
    modules.quotes = true
    modules.deposits = true
  }
  if (workMode === 'appointments') {
    modules.appointments = true
  }
  return modules
}

function pickWorkspace(source = {}, { plan, tradeId, workMode } = {}) {
  const defaults = tradeModules(tradeId, workMode)
  const incoming = source?.modules && typeof source.modules === 'object' ? source.modules : {}
  const modules = {}
  for (const id of MODULE_IDS) {
    modules[id] = typeof incoming[id] === 'boolean' ? incoming[id] : Boolean(defaults[id])
  }
  if (plan !== 'pro') {
    for (const id of PRO_MODULES) modules[id] = false
  } else {
    for (const id of PRO_MODULES) {
      if (typeof incoming[id] !== 'boolean') modules[id] = true
    }
  }
  return {
    displayAs: source?.displayAs === 'person' ? 'person' : 'company',
    modules,
  }
}

function workspaceForUser(user) {
  return pickWorkspace(user?.workspace?.toObject?.() || user?.workspace || {}, {
    plan: user?.subscription?.plan,
    tradeId: user?.onboarding?.trade,
    workMode: user?.onboarding?.workMode,
  })
}

function userHasModule(user, id) {
  return Boolean(workspaceForUser(user).modules[id])
}

const SESSION_TRADES = new Set(['wellness', 'beauty', 'health'])

function asksSessionPayment(user, appointment) {
  if (appointment?.kind === 'quote') return false
  if (appointment?.source === 'booking') return true
  if (SESSION_TRADES.has(user?.onboarding?.trade)) return true
  if (!userHasModule(user, 'quotes') && !userHasModule(user, 'deposits')) return true
  return false
}

function sessionAmount(appointment, contact) {
  const fromRdv = Number(appointment?.servicePrice)
  if (Number.isFinite(fromRdv) && fromRdv > 0) return fromRdv
  const fromContact = Number(contact?.price)
  if (Number.isFinite(fromContact) && fromContact > 0) return fromContact
  return 0
}

const PAYMENT_METHODS = {
  cash: 'Espèces',
  card: 'Carte',
  cheque: 'Chèque',
  transfer: 'Virement',
}

function parsePaymentMethod(value) {
  const id = String(value || '').trim()
  return PAYMENT_METHODS[id] ? id : ''
}

function paymentMethodLabel(id) {
  return PAYMENT_METHODS[id] || ''
}

module.exports = {
  MODULE_IDS,
  ESSENTIEL_MODULES,
  PRO_MODULES,
  PAYMENT_METHODS,
  pickWorkspace,
  workspaceForUser,
  userHasModule,
  asksSessionPayment,
  sessionAmount,
  parsePaymentMethod,
  paymentMethodLabel,
  tradeModules,
  getTrade,
}
