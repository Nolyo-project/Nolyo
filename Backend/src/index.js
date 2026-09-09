require('dotenv').config()

const fs = require('fs')
const path = require('path')
const cors = require('cors')
const express = require('express')
const { connectDb } = require('./config/db')
const { ensurePresident } = require('./seed/president')
const { ensureDemoAccounts, DEMO_EMAILS } = require('./seed/demoMember')
const { ensureSeedSiteReviews } = require('./utils/siteReviews')
const User = require('./models/User')
const healthRouter = require('./routes/health')
const itemsRouter = require('./routes/items')
const authRouter = require('./routes/auth')
const requestsRouter = require('./routes/requests')
const presidentRouter = require('./routes/president')
const notesRouter = require('./routes/notes')
const workspaceRouter = require('./routes/workspace')
const publicRouter = require('./routes/public')
const { handleStripeWebhook } = require('./routes/stripeWebhook')
const billingRouter = require('./routes/billing')
const { runBillingJobs } = require('./jobs/billing')
const { runReminderJobs } = require('./jobs/reminders')
const { schedule: scheduleCron } = require('node-cron')
const { UPLOAD_ROOT } = require('./utils/uploads')

function fillMissingEnv() {
  const envPath = path.join(__dirname, '../.env')
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const value = trimmed.slice(eq + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

fillMissingEnv()

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing from environment variables')
}

{
  const whsec = String(process.env.STRIPE_WEBHOOK_SECRET || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Stripe: STRIPE_SECRET_KEY manquant')
  } else if (!whsec) {
    console.warn('Stripe: STRIPE_WEBHOOK_SECRET manquant (les webhooks renverront 400)')
  } else if (!whsec.startsWith('whsec_')) {
    console.warn('Stripe: STRIPE_WEBHOOK_SECRET ne commence pas par whsec_ (mauvaise valeur ?)')
  } else {
    console.info(`Stripe webhook secret OK (longueur ${whsec.length})`)
  }
}

const origins = [
  process.env.CLIENT_ORIGIN,
  process.env.ADMIN_ORIGIN,
  process.env.SITE_ORIGIN,
]
  .filter(Boolean)
  .flatMap((value) => value.split(',').map((item) => item.trim()).filter(Boolean))

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true)
  if (origins.includes(origin)) return callback(null, true)
  if (/^http:\/\/(localhost|127\.0\.0\.1|admin\.localhost):\d+$/.test(origin)) return callback(null, true)
  if (/^https:\/\/(www\.)?nolyo\.fr$/.test(origin) || origin === 'https://admin.nolyo.fr') {
    return callback(null, true)
  }
  // Previews / domaines Vercel en attendant les DNS custom
  if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)) {
    return callback(null, true)
  }
  return callback(new Error('Origine non autorisée.'))
}

const app = express()
const port = Number(process.env.PORT) || 5050

app.use(
  cors({
    origin: corsOrigin,
  }),
)

// Stripe exige le body brut (Buffer). Ne pas passer par express.json() avant.
app.post(
  '/api/stripe/webhook',
  express.raw({ type: '*/*' }),
  handleStripeWebhook,
)
app.use(express.json())
app.use('/uploads', express.static(UPLOAD_ROOT))

app.use('/api/health', healthRouter)
app.use('/api/items', itemsRouter)
app.use('/api/auth', authRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/president', presidentRouter)
app.use('/api/notes', notesRouter)
app.use('/api/workspace', workspaceRouter)
app.use('/api/public', publicRouter)
app.use('/api/billing', billingRouter)
app.get('/robots.txt', (req, res, next) => {
  req.url = '/robots.txt'
  return publicRouter.handle(req, res, next)
})
app.get('/sitemap.xml', (req, res, next) => {
  req.url = '/sitemap.xml'
  return publicRouter.handle(req, res, next)
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable.' })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur.' })
})

async function start() {
  await connectDb()
  await ensurePresident()
  const SiteSettings = require('./models/SiteSettings')
  await SiteSettings.getSiteSettings()
  // Toujours : fondateur conservé, 2 comptes visiteurs (Essentiel + Pro page publique), reste purgé
  await ensureDemoAccounts()
  await ensureSeedSiteReviews()
  await User.updateMany(
    {
      role: 'member',
      email: { $nin: DEMO_EMAILS },
      'onboarding.completedAt': { $exists: false },
      'page.slug': { $gt: '' },
    },
    {
      $set: {
        'onboarding.completedAt': new Date(),
        'onboarding.trade': 'other',
        'onboarding.workMode': 'mix',
      },
    },
  )

  await new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`)
      resolve(server)
    })
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Le port ${port} est déjà pris (souvent une autre app). Changez PORT dans Backend/.env.`,
          ),
        )
        return
      }
      reject(err)
    })
  })

  scheduleCron(
    '15 8 * * *',
    () => {
      runBillingJobs().catch((err) => console.error('billing job', err))
    },
    { timezone: 'Europe/Paris' },
  )
  scheduleCron('* * * * *', () => {
    runReminderJobs().catch((err) => console.error('reminder jobs', err))
  })
  setTimeout(() => {
    runBillingJobs().catch((err) => console.error('billing job', err))
  }, 8000)
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
