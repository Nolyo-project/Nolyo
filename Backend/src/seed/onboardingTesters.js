const Service = require('../models/Service')
const User = require('../models/User')

const PASSWORD = process.env.DEMO_PASSWORD || 'NolioDemo2026!'

const TESTERS = [
  {
    email: 'test.pro@nolio.test',
    name: 'Camille Pro',
    plan: 'pro',
  },
  {
    email: 'test.essentiel@nolio.test',
    name: 'Jules Essentiel',
    plan: 'essentiel',
  },
]

async function resetTester(profile) {
  const email = profile.email
  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({
      name: profile.name,
      email,
      passwordHash: await User.hashPassword(PASSWORD),
      role: 'member',
      subscription: {
        plan: profile.plan,
        status: 'active',
        company: '',
        teamSize: '1',
        activatedAt: new Date(),
      },
    })
  } else {
    user.name = profile.name
    user.role = 'member'
    if (!(await user.checkPassword(PASSWORD))) {
      user.passwordHash = await User.hashPassword(PASSWORD)
    }
    user.subscription = {
      ...(user.subscription?.toObject?.() || user.subscription || {}),
      plan: profile.plan,
      status: 'active',
      company: '',
      teamSize: user.subscription?.teamSize || '1',
      activatedAt: user.subscription?.activatedAt || new Date(),
    }
  }

  user.onboarding = {}
  user.page = User.pickPage({})
  user.schedule = undefined
  user.depositPlan = User.DEFAULT_DEPOSIT_PLAN.map((step) => ({ ...step }))
  await user.save()
  await User.updateOne({ _id: user._id }, { $unset: { onboarding: 1, schedule: 1 } })
  await Service.deleteMany({ user: user._id })
  console.log(`Compte test onboarding prêt : ${email} (${profile.plan})`)
}

async function ensureOnboardingTesters() {
  for (const profile of TESTERS) {
    await resetTester(profile)
  }
}

module.exports = { ensureOnboardingTesters, TESTER_EMAILS: TESTERS.map((item) => item.email) }
