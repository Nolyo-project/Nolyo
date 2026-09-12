const MAX_EDGE = 1920
const MAX_BYTES = 2.4 * 1024 * 1024

function rename(name, ext) {
  const base = String(name || 'photo').replace(/\.[^.]+$/, '') || 'photo'
  return `${base}.${ext}`
}

async function canvasToBlob(canvas, type, quality) {
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
  return blob
}

export async function prepareImageFile(file) {
  if (!file) return file
  const type = String(file.type || '')
  if (!type.startsWith('image/')) {
    throw new Error('Choisissez une image JPEG, PNG ou WebP.')
  }
  if (type === 'image/gif') return file

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Cette image ne peut pas être lue. Envoyez un JPEG, PNG ou WebP.')
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const keepPng = type === 'image/png' && file.size <= MAX_BYTES && scale === 1
  if (keepPng) return file

  let blob = await canvasToBlob(canvas, 'image/jpeg', 0.86)
  if (blob && blob.size > MAX_BYTES) {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.7)
  }
  if (!blob) return file
  if (blob.size > MAX_BYTES) {
    throw new Error('Image trop lourde même après compression (3 Mo maximum).')
  }
  return new File([blob], rename(file.name, 'jpg'), { type: 'image/jpeg' })
}
