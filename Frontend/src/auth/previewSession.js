const PREVIEW_FLAG = 'nolio_preview'
const PREVIEW_EXIT = 'nolio_preview_exit'

export function markPreviewSession(active) {
  if (active) sessionStorage.setItem(PREVIEW_FLAG, '1')
  else sessionStorage.removeItem(PREVIEW_FLAG)
}

export function hasPreviewSession() {
  return sessionStorage.getItem(PREVIEW_FLAG) === '1'
}

export function markPreviewExit(to) {
  if (to === 'subscribe' || to === 'home') {
    sessionStorage.setItem(PREVIEW_EXIT, to)
  }
}

export function consumePreviewExit() {
  const to = sessionStorage.getItem(PREVIEW_EXIT)
  if (to) sessionStorage.removeItem(PREVIEW_EXIT)
  return to
}
