const fs = require('fs')
const path = require('path')
const multer = require('multer')

function resolveUploadRoot() {
  const fromEnv = String(process.env.UPLOAD_DIR || '').trim()
  if (fromEnv) return fromEnv
  const volume = String(process.env.RAILWAY_VOLUME_MOUNT_PATH || '').trim()
  if (volume) return path.join(volume, 'uploads')
  return path.join(__dirname, '../../uploads')
}

const UPLOAD_ROOT = resolveUploadRoot()
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

ensureDir(path.join(UPLOAD_ROOT, 'avatars'))
ensureDir(path.join(UPLOAD_ROOT, 'pages'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter(_req, file, done) {
    if (!ALLOWED.has(file.mimetype)) {
      done(new Error('Image JPEG, PNG ou WebP uniquement.'))
      return
    }
    done(null, true)
  },
})

function publicPath(relative) {
  return `/uploads/${relative.replace(/\\/g, '/')}`
}

function keyFromPublic(url) {
  if (!url || !String(url).startsWith('/uploads/')) return ''
  const key = String(url).slice('/uploads/'.length).replace(/\\/g, '/')
  if (!key || key.includes('..')) return ''
  return key
}

function absoluteFromPublic(url) {
  const key = keyFromPublic(url)
  if (!key) return null
  return path.join(UPLOAD_ROOT, key)
}

function storedFile() {
  return require('../models/StoredFile')
}

async function upsertStoredFile(relative, mime, buffer) {
  const key = String(relative || '').replace(/\\/g, '/')
  if (!key || !buffer?.length) return
  await storedFile().findOneAndUpdate(
    { key },
    { key, mime: mime || 'application/octet-stream', data: buffer },
    { upsert: true },
  )
}

async function saveLocalFileToStore(abs, relative, mime) {
  if (!abs || !fs.existsSync(abs)) return
  await upsertStoredFile(relative, mime, fs.readFileSync(abs))
}

async function removeFile(url) {
  const key = keyFromPublic(url)
  const abs = absoluteFromPublic(url)
  if (key) {
    await storedFile()
      .deleteOne({ key })
      .catch(() => {})
  }
  if (!abs) return
  try {
    fs.unlinkSync(abs)
  } catch {
    /* already gone */
  }
}

async function saveImage(file, folder, basename) {
  const ext = EXT[file.mimetype] || '.jpg'
  const relative = `${folder}/${basename}${ext}`
  const abs = path.join(UPLOAD_ROOT, relative)
  ensureDir(path.dirname(abs))
  fs.writeFileSync(abs, file.buffer)
  await upsertStoredFile(relative, file.mimetype, file.buffer)
  return publicPath(relative)
}

async function serveUpload(req, res, next) {
  const key = decodeURIComponent(req.path || '')
    .replace(/^\/+/, '')
    .replace(/\\/g, '/')
  if (!key || key.includes('..')) return next()
  try {
    const doc = await storedFile().findOne({ key }).lean()
    if (doc?.data) {
      const body = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data.buffer || doc.data)
      res.setHeader('Content-Type', doc.mime || 'application/octet-stream')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.send(body)
    }
  } catch {
    /* fallback disque */
  }
  return next()
}

async function ingestDiskUploads() {
  const folders = ['avatars', 'pages']
  let count = 0
  for (const folder of folders) {
    const dir = path.join(UPLOAD_ROOT, folder)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name)
      if (!fs.statSync(abs).isFile()) continue
      const ext = path.extname(name).toLowerCase()
      const mime =
        ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg'
      await saveLocalFileToStore(abs, `${folder}/${name}`, mime)
      count += 1
    }
  }
  if (count) console.log(`Images disque synchronisées vers Mongo (${count})`)
}

function handleMulter(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image trop lourde (3 Mo maximum).' })
    }
    return res.status(400).json({ error: err.message || 'Image invalide.' })
  })
}

module.exports = {
  handleMulter,
  saveImage,
  removeFile,
  serveUpload,
  ingestDiskUploads,
  saveLocalFileToStore,
  UPLOAD_ROOT,
}
