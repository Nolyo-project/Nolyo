const User = require('../models/User')

async function ensurePresident() {
  const email = String(process.env.PRESIDENT_EMAIL || '')
    .trim()
    .toLowerCase()
  const password = String(process.env.PRESIDENT_PASSWORD || '')
  const name = String(process.env.PRESIDENT_NAME || 'Président').trim()

  if (!email || !password) {
    console.warn('PRESIDENT_EMAIL / PRESIDENT_PASSWORD manquants : compte président non créé.')
    return
  }

  const existing = await User.findOne({ email })
  if (existing) {
    if (existing.role !== 'president') {
      existing.role = 'president'
      await existing.save()
    }
    return
  }

  await User.create({
    name,
    email,
    passwordHash: await User.hashPassword(password),
    role: 'president',
  })

  console.log(`Compte président prêt : ${email}`)
}

module.exports = { ensurePresident }
