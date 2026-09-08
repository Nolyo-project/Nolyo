require('dotenv').config()

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const Appointment = require('../src/models/Appointment')
const Contact = require('../src/models/Contact')
const Note = require('../src/models/Note')
const User = require('../src/models/User')

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

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5050}`
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'ines@nolio.test'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'NolioDemo2026!'
const MARKER = 'Nolyo Test popup'

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function api(pathname, token, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${pathname} → ${res.status} ${data.error || ''}`.trim())
  }
  return data
}

async function cleanTestData(userId) {
  const contacts = await Contact.find({ user: userId, company: MARKER })
  const ids = contacts.map((item) => item._id)
  if (ids.length) {
    await Appointment.deleteMany({ user: userId, contact: { $in: ids } })
    await Note.deleteMany({ user: userId, contact: { $in: ids } })
    await Contact.deleteMany({ _id: { $in: ids } })
  }
}

async function makeContact(userId, fields) {
  return Contact.create({
    user: userId,
    company: MARKER,
    ...fields,
  })
}

async function makePastRdv(userId, contact, hours, durationMinutes = 30) {
  return Appointment.create({
    user: userId,
    contact: contact._id,
    title: `RDV test — ${contact.name}`,
    startAt: hoursAgo(hours),
    durationMinutes,
    status: 'planned',
    location: 'Visio test',
  })
}

async function login() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Login ${res.status}`)
  return data.token
}

async function main() {
  const failures = []
  const token = await login()
  await mongoose.connect(process.env.MONGODB_URI)
  const user = await User.findOne({ email: DEMO_EMAIL })
  assert(user, `Compte démo introuvable : ${DEMO_EMAIL}`)

  await cleanTestData(user._id)

  const apiProspect = await makeContact(user._id, {
    firstName: 'Camille',
    lastName: 'API',
    name: 'Camille API',
    kind: 'prospect',
    activity: 'Architecte',
    email: 'camille.api@nolio.test',
  })
  const noteRdv = await makePastRdv(user._id, apiProspect, 3)
  const archiveRdv = await makePastRdv(user._id, apiProspect, 4)
  const clientRdv = await makePastRdv(user._id, apiProspect, 5)
  const inProgress = await Appointment.create({
    user: user._id,
    contact: apiProspect._id,
    title: 'RDV encore en cours',
    startAt: hoursAgo(0.2),
    durationMinutes: 60,
    status: 'planned',
  })
  const future = await Appointment.create({
    user: user._id,
    contact: apiProspect._id,
    title: 'RDV encore à venir',
    startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    durationMinutes: 30,
    status: 'planned',
  })

  try {
    const listed = await api('/api/workspace/follow-ups', token)
    const ids = (listed.appointments || []).map((item) => String(item._id))
    assert(ids.includes(String(noteRdv._id)), 'Le RDV terminé devrait apparaître dans la file.')
    assert(!ids.includes(String(inProgress._id)), 'Un RDV encore en cours ne doit pas ouvrir la popup.')
    assert(!ids.includes(String(future._id)), 'Un RDV à venir ne doit pas ouvrir la popup.')
    console.log('OK  file : RDV terminé visible, en cours et à venir exclus')
  } catch (err) {
    failures.push(err.message)
    console.error('FAIL file :', err.message)
  }

  try {
    const result = await api(`/api/workspace/appointments/${noteRdv._id}/follow-up`, token, {
      method: 'POST',
      body: { action: 'note', note: 'Elle hésite encore sur le budget.' },
    })
    assert(result.appointment.status === 'done', 'Le RDV doit passer en fait après une note.')
    const notes = await Note.find({ user: user._id, contact: apiProspect._id })
    assert(
      notes.some((item) => item.body.includes('budget')),
      'La note après RDV doit être enregistrée sur la fiche.',
    )
    const listed = await api('/api/workspace/follow-ups', token)
    const ids = (listed.appointments || []).map((item) => String(item._id))
    assert(!ids.includes(String(noteRdv._id)), 'Après une note, le RDV ne doit plus être dans la popup.')
    console.log('OK  note : RDV marqué fait, note sur la fiche, popup refermée')
  } catch (err) {
    failures.push(err.message)
    console.error('FAIL note :', err.message)
  }

  try {
    const result = await api(`/api/workspace/appointments/${archiveRdv._id}/follow-up`, token, {
      method: 'POST',
      body: { action: 'archive' },
    })
    const contact = await Contact.findById(apiProspect._id)
    assert(result.appointment.status === 'done', 'Sans suite doit clôturer le RDV.')
    assert(contact.kind === 'prospect', 'Sans suite ne doit pas transformer le prospect en client.')
    assert(contact.jobStatus === 'archived', 'Sans suite doit archiver le contact.')
    console.log('OK  sans suite : prospect archivé, toujours prospect')
  } catch (err) {
    failures.push(err.message)
    console.error('FAIL sans suite :', err.message)
  }

  try {
    await Contact.findByIdAndUpdate(apiProspect._id, { kind: 'prospect', jobStatus: 'open' })
    const result = await api(`/api/workspace/appointments/${clientRdv._id}/follow-up`, token, {
      method: 'POST',
      body: { action: 'client' },
    })
    const contact = await Contact.findById(apiProspect._id)
    assert(result.appointment.status === 'done', 'Passer en client doit clôturer le RDV.')
    assert(contact.kind === 'client', 'Le prospect doit devenir client.')
    assert(contact.jobStatus === 'open', 'Le nouveau client doit être en cours.')
    console.log('OK  client : prospect passé en client')
  } catch (err) {
    failures.push(err.message)
    console.error('FAIL client :', err.message)
  }

  await Appointment.deleteMany({ _id: { $in: [noteRdv._id, archiveRdv._id, clientRdv._id, inProgress._id, future._id] } })
  await Note.deleteMany({ user: user._id, contact: apiProspect._id })
  await Contact.deleteMany({ _id: apiProspect._id })

  const uiProspect = await makeContact(user._id, {
    firstName: 'Camille',
    lastName: 'Roux',
    name: 'Camille Roux',
    kind: 'prospect',
    activity: 'Architecte',
    email: 'camille.roux@nolio.test',
    phone: '06 00 00 00 01',
  })
  const uiClient = await makeContact(user._id, {
    name: 'Nicolas Test',
    kind: 'client',
    email: 'nicolas.test@nolio.test',
    phone: '06 00 00 00 02',
    price: 0,
  })
  await makePastRdv(user._id, uiProspect, 2)
  await makePastRdv(user._id, uiClient, 3)

  const ready = await api('/api/workspace/follow-ups', token)
  const visible = (ready.appointments || []).filter((item) => item.contact?.company === MARKER)
  console.log('')
  console.log(`File prête pour l’écran : ${visible.length} popup(s)`)
  for (const item of visible) {
    console.log(` - ${item.contact.name} (${item.contact.kind}) · ${item.title}`)
  }

  await mongoose.disconnect()

  if (failures.length) {
    console.error('\nÉchecs :')
    for (const message of failures) console.error(` - ${message}`)
    process.exit(1)
  }

  console.log('\nTous les tests API sont passés.')
  console.log('Rafraîchis le tableau de bord (connecté en ines@nolio.test) : la popup doit s’ouvrir.')
  console.log('1) Camille Roux, prospect → Passer en client / Sans suite / Note')
  console.log('2) Nicolas Test, client → Sans suite / Note (pas de Passer en client)')
}

main().catch(async (err) => {
  console.error(err)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
