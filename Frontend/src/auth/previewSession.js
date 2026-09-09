const PREVIEW_FLAG = 'nolio_preview'
const PREVIEW_EXIT = 'nolio_preview_exit'
const PREVIEW_PLAN = 'nolio_preview_plan'

export function markPreviewSession(active) {
  if (active) sessionStorage.setItem(PREVIEW_FLAG, '1')
  else sessionStorage.removeItem(PREVIEW_FLAG)
}

export function hasPreviewSession() {
  return sessionStorage.getItem(PREVIEW_FLAG) === '1'
}

export function markPreviewPlan(plan) {
  if (plan === 'essentiel' || plan === 'pro') {
    sessionStorage.setItem(PREVIEW_PLAN, plan)
  }
}

export function peekPreviewPlan() {
  const plan = sessionStorage.getItem(PREVIEW_PLAN)
  return plan === 'essentiel' || plan === 'pro' ? plan : 'pro'
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

export function consumePreviewPlan() {
  const plan = peekPreviewPlan()
  sessionStorage.removeItem(PREVIEW_PLAN)
  return plan
}

/** Fin d’essai démo → demande d’abonnement (redirection dure). */
export function endPreviewToSubscribe(logout, user) {
  const plan =
    user?.previewPlan === 'essentiel' || user?.subscription?.plan === 'essentiel'
      ? 'essentiel'
      : peekPreviewPlan() === 'essentiel'
        ? 'essentiel'
        : 'pro'
  logout('subscribe')
  window.location.replace(`/abonnement?plan=${plan}&essai=termine`)
}
