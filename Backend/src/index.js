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
const { UPLOAD_ROOT, serveUpload, ingestDiskUploads } = require('./utils/uploads')

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
  .flatMap((value) => value.split(',').map((item) => item.trim().replace(/\/$/, '')).filter(Boolean))
  .flatMap((origin) => {
    if (!/^https?:\/\/www\./i.test(origin)) {
      return [origin, origin.replace(/^(https?:\/\/)/i, '$1www.')]
    }
    return [origin, origin.replace(/^(https?:\/\/)www\./i, '$1')]
  })

function isAllowedOrigin(origin) {
  if (origins.includes(origin)) return true
  if (/^http:\/\/(localhost|127\.0\.0\.1|admin\.localhost):\d+$/.test(origin)) return true
  if (/^https:\/\/(www\.)?nolyo\.fr$/.test(origin) || origin === 'https://admin.nolyo.fr') return true
  if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)) return true
  return false
}

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true)
  if (isAllowedOrigin(origin)) return callback(null, origin)
  return callback(new Error('Origine non autorisée.'))
}

const app = express()
const port = Number(process.env.PORT) || 5050

const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))

// Stripe exige les octets exacts du body (signature HMAC).
function stripeRawBody(req, res, next) {
  if (req.method !== 'POST') return next()
  const chunks = []
  req.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  })
  req.on('end', () => {
    req.body = Buffer.concat(chunks)
    next()
  })
  req.on('error', next)
}

app.post('/api/stripe/webhook', stripeRawBody, handleStripeWebhook)
app.use(express.json())
app.use(express.text({ type: 'text/plain', limit: '32kb' }))
app.use('/uploads', serveUpload)
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
  const status = Number(err.status) || 500
  res.status(status).json({ error: status === 400 ? err.message || 'Requête invalide.' : 'Erreur serveur.' })
})

async function start() {
  await connectDb()
  await ingestDiskUploads().catch((err) => console.warn('Sync images', err.message))
  await ensurePresident()
  const SiteSettings = require('./models/SiteSettings')
  await SiteSettings.getSiteSettings()
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
      const { mailEnabled } = require('./utils/mail')
      if (mailEnabled()) {
        const svc = String(process.env.EMAILJS_SERVICE_ID || '')
          .trim()
          .replace(/^['"]|['"]$/g, '')
        const tpl = String(process.env.EMAILJS_TEMPLATE_ID || '')
          .trim()
          .replace(/^['"]|['"]$/g, '')
        console.info(
          `EmailJS OK (service=${svc}, template=${tpl}, privateKey=${process.env.EMAILJS_PRIVATE_KEY ? 'oui' : 'non'})`,
        )
      } else {
        console.warn('EmailJS non configuré — les e-mails ne partiront pas (EMAILJS_* manquants).')
      }
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
