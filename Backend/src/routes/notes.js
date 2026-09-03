const express = require('express')
const Contact = require('../models/Contact')
const Note = require('../models/Note')
const { requireAuth, requireSubscription } = require('../middleware/auth')

const router = express.Router()

router.use(requireAuth, requireSubscription)

async function resolveContact(userId, contactId) {
  if (!contactId) return undefined
  const contact = await Contact.findOne({ _id: contactId, user: userId }).select('_id')
  return contact?._id || null
}

router.get('/', async (req, res) => {
  const filter = { user: req.user._id }
  if (req.query.contact === 'none') filter.contact = { $in: [null, undefined] }
  else if (req.query.contact) filter.contact = req.query.contact

  const notes = await Note.find(filter)
    .sort({ updatedAt: -1 })
    .populate('contact', 'name company')
    .limit(100)
  res.json({ notes })
})

router.post('/', async (req, res) => {
  const title = String(req.body?.title || '').trim()
  const body = String(req.body?.body || '').trim()
  if (!title) return res.status(400).json({ error: 'Donnez un titre à votre note.' })

  const contact = await resolveContact(req.user._id, req.body?.contact)
  if (req.body?.contact && !contact) {
    return res.status(400).json({ error: 'Client introuvable.' })
  }

  const note = await Note.create({
    user: req.user._id,
    title,
    body,
    contact,
  })
  await note.populate('contact', 'name company')
  res.status(201).json({ note })
})

router.patch('/:id', async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id })
  if (!note) return res.status(404).json({ error: 'Note introuvable.' })

  if (req.body?.title !== undefined) {
    const title = String(req.body.title).trim()
    if (!title) return res.status(400).json({ error: 'Donnez un titre à votre note.' })
    note.title = title
  }
  if (req.body?.body !== undefined) note.body = String(req.body.body).trim()
  if (req.body?.contact !== undefined) {
    if (!req.body.contact) {
      note.contact = null
    } else {
      const contact = await resolveContact(req.user._id, req.body.contact)
      if (!contact) return res.status(400).json({ error: 'Client introuvable.' })
      note.contact = contact
    }
  }

  await note.save()
  await note.populate('contact', 'name company')
  res.json({ note })
})

router.delete('/:id', async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!note) return res.status(404).json({ error: 'Note introuvable.' })
  res.json({ ok: true })
})

module.exports = router
