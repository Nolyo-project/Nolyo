const express = require('express')
const Item = require('../models/Item')

const router = express.Router()

router.get('/', async (_req, res) => {
  const items = await Item.find().sort({ createdAt: -1 })
  res.json(items)
})

router.post('/', async (req, res) => {
  const { name } = req.body

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Le champ name est requis.' })
  }

  const item = await Item.create({ name: String(name).trim() })
  res.status(201).json(item)
})

module.exports = router
