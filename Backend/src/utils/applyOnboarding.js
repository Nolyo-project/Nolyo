const Service = require('../models/Service')
const User = require('../models/User')
const { getTrade } = require('../data/trades')
const { pickWorkspace } = require('../data/workspace')

const RESERVED = new Set([
  'api',
  'login',
  'inscription',
  'abonnement',
  'dashboard',
  'president',
  'uploads',
  'p',
  'admin',
  'nolio',
  'onboarding',
])

function firstNameOf(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Vous'
}

async function uniqueSlug(base, userId) {
  let slug = User.slugify(base) || 'page'
  if (RESERVED.has(slug)) slug = `${slug}-pro`
  let candidate = slug.slice(0, 48)
  let n = 2
  while (await User.findOne({ 'page.slug': candidate, _id: { $ne: userId } })) {
    const suffix = `-${n}`
    candidate = `${slug}`.slice(0, 48 - suffix.length) + suffix
    n += 1
  }
  return candidate
}

function scheduleFor(trade, workMode) {
  const base = { ...trade.schedule, workDays: [...trade.schedule.workDays] }
  if (workMode === 'projects') {
    base.workDays = [1, 2, 3, 4, 5]
    base.durationMinutes = Math.max(base.durationMinutes, 60)
  }
  return base
}

function depositFor(trade, workMode) {
  if (workMode === 'projects') {
    return [
      { label: 'Acompte', percent: 40 },
      { label: 'Solde', percent: 60 },
    ]
  }
  return trade.depositPlan.map((step) => ({ ...step }))
}

async function applyOnboarding(user, answers) {
  const trade = getTrade(answers.trade)
  const workMode = answers.workMode
  const company = answers.company
  const city = answers.city
  const firstName = firstNameOf(user.name)
  const preparePage = user.subscription?.plan === 'pro'
  const currentPage = User.pickPage(user.page?.toObject?.() || user.page || {})

  user.onboarding = {
    completedAt: new Date(),
    trade: trade.id,
    tradeLabel: answers.trade === 'other' ? answers.tradeLabel : trade.label,
    workMode,
    city,
    company,
  }

  if (!user.subscription) user.subscription = { status: 'active' }
  user.subscription.company = company

  const business = User.pickBusiness(user.business?.toObject?.() || user.business || {})
  business.tradeName = company
  business.legalName = business.legalName || company
  if (city) business.city = city
  user.business = business

  user.workspace = pickWorkspace(
    { displayAs: answers.displayAs },
    { plan: user.subscription?.plan, tradeId: trade.id, workMode },
  )

  user.schedule = scheduleFor(trade, workMode)
  user.depositPlan = User.pickDepositPlan(depositFor(trade, workMode))

  if (preparePage) {
    const title = answers.title || trade.pageTitle(company, city)
    const description = answers.description || trade.pageDescription(firstName, company, city)
    const slug = currentPage.slug || (await uniqueSlug(company || user.name, user._id))
    user.page = User.pickPage({
      ...currentPage,
      slug,
      published: true,
      title: title.slice(0, 80),
      description: description.slice(0, 800),
      email: currentPage.email || user.email,
      address: currentPage.address || city,
    })
  }

  await user.save()

  const existing = await Service.countDocuments({ user: user._id })
  if (existing === 0) {
    const wanted = new Set((answers.services || []).map((name) => String(name).trim()).filter(Boolean))
    const catalog = trade.services.filter((item) => wanted.has(item.name))
    if (catalog.length) {
      await Service.create(catalog.map((item, index) => ({ user: user._id, sort: index, ...item })))
    }
  }

  return user
}

module.exports = { applyOnboarding }
