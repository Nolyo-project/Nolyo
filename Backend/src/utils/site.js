function publicOrigin() {
  return String(process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN || 'https://nolyo.fr').replace(/\/$/, '')
}

function publicUrl(path = '/') {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${publicOrigin()}${suffix}`
}

function firstName(full) {
  return String(full || '').trim().split(/\s+/)[0] || ''
}

module.exports = { publicOrigin, publicUrl, firstName }
