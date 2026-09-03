require('dotenv').config()

const fs = require('fs')
const path = require('path')
const cors = require('cors')
const express = require('express')
const { connectDb } = require('./config/db')
const { ensurePresident } = require('./seed/president')
const { ensureDemoMember, ensureEssentielMember } = require('./seed/demoMember')
const healthRouter = require('./routes/health')
const itemsRouter = require('./routes/items')
const authRouter = require('./routes/auth')
const requestsRouter = require('./routes/requests')
const presidentRouter = require('./routes/president')
const notesRouter = require('./routes/notes')
const workspaceRouter = require('./routes/workspace')

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

const app = express()
const port = Number(process.env.PORT) || 5050

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  }),
)
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/items', itemsRouter)
app.use('/api/auth', authRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/president', presidentRouter)
app.use('/api/notes', notesRouter)
app.use('/api/workspace', workspaceRouter)

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
  await ensureDemoMember()
  await ensureEssentielMember()
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
