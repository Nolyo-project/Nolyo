const fs = require('fs')
const path = require('path')
const multer = require('multer')

const UPLOAD_ROOT = path.join(__dirname, '../../uploads')
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

function absoluteFromPublic(url) {
  if (!url || !String(url).startsWith('/uploads/')) return null
  return path.join(UPLOAD_ROOT, String(url).slice('/uploads/'.length))
}

function removeFile(url) {
  const abs = absoluteFromPublic(url)
  if (!abs) return
  try {
    fs.unlinkSync(abs)
  } catch {
    /* already gone */
  }
}

function saveImage(file, folder, basename) {
  const ext = EXT[file.mimetype] || '.jpg'
  const relative = `${folder}/${basename}${ext}`
  const abs = path.join(UPLOAD_ROOT, relative)
  ensureDir(path.dirname(abs))
  fs.writeFileSync(abs, file.buffer)
  return publicPath(relative)
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

module.exports = { handleMulter, saveImage, removeFile, UPLOAD_ROOT }
