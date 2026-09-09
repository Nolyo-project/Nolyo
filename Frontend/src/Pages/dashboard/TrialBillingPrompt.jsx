import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { formatPrice, planLabels, plans } from '../../data/plans'
import { formatDay, trialDaysLeft } from './format'
import { primaryBtn, quietBtn } from './ui'

function calendarDaysUntil(date) {
  if (!date) return null
  const end = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / 86400000)
}

function commitmentEndDate(sub = {}) {
  if (sub.commitmentEndsAt) return new Date(sub.commitmentEndsAt)
  if (sub.trialEndsAt) {
    const end = new Date(sub.trialEndsAt)
    end.setMonth(end.getMonth() + 6)
    return end
  }
  if (sub.activatedAt) {
    const end = new Date(sub.activatedAt)
    end.setMonth(end.getMonth() + 7)
    return end
  }
  return null
}

export function detectBillingPromptPhase(user) {
  if (!user || user.role === 'president' || user.preview) return null
  const sub = user.subscription || {}
  if (user.deletionRequest?.status === 'pending') return null

  // Fin d'engagement (7 mois)
  const commitmentEnd = commitmentEndDate(sub)
  const commitmentLeft = commitmentEnd ? calendarDaysUntil(commitmentEnd) : null
  const commitmentDone =
    sub.commitmentChoice === 'continue_auto' ||
    sub.commitmentChoice === 'continue_invoice' ||
    sub.commitmentChoice === 'stop'
  if (
    sub.status === 'active' &&
    !commitmentDone &&
    commitmentLeft != null &&
    commitmentLeft <= 2
  ) {
    return 'commitment'
  }

  // Fin de mois offert
  if (sub.status !== 'trialing' && sub.status !== 'past_due') return null
  if (sub.billingChoice === 'auto' || sub.billingChoice === 'invoice' || sub.billingChoice === 'stop') {
    return null
  }
  if (sub.hasPaymentMethod && sub.collectionMethod === 'charge_automatically' && sub.status === 'trialing') {
    return null
  }
  if (sub.status === 'past_due') return 'trial'
  const left = calendarDaysUntil(sub.trialEndsAt)
  if (left == null) return null
  return left <= 2 ? 'trial' : null
}

export function shouldShowBillingPrompt(user) {
  return Boolean(detectBillingPromptPhase(user))
}

function PlanCard({ plan, selected, current, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition ${
        selected
          ? 'border-copper bg-cream shadow-sm ring-1 ring-copper/25'
          : 'border-ink/10 bg-paper/80 hover:border-copper/35'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{plan.name}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{plan.audience}</p>
        </div>
        <p className="shrink-0 font-display text-xl">{formatPrice(plan.price)}</p>
      </div>
      <p className="mt-2 text-xs text-ink-soft">/ mois · {plan.commitment}</p>
      {current ? (
        <p className="mt-2 inline-flex rounded-full bg-moss/10 px-2.5 py-1 text-[11px] font-semibold text-moss">
          Votre formule actuelle
        </p>
      ) : null}
    </button>
  )
}

export default function TrialBillingPrompt() {
  const { user, updateUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pending, setPending] = useState('')
  const [stopNote, setStopNote] = useState('')
  const [showStop, setShowStop] = useState(false)
  const [planId, setPlanId] = useState(() => user?.subscription?.plan || 'essentiel')

  useEffect(() => {
    if (user?.subscription?.plan) setPlanId(user.subscription.plan)
  }, [user?.subscription?.plan])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (refreshUser) {
          const next = await refreshUser()
          if (!cancelled) setPhase(detectBillingPromptPhase(next || user))
        }
      } catch {
        if (!cancelled) setPhase(detectBillingPromptPhase(user))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPhase(detectBillingPromptPhase(user))
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('carte') !== '1') return undefined
    const sessionId = params.get('session_id') || ''
    const returnPhase = params.get('phase') || ''
    let cancelled = false
    ;(async () => {
      try {
        const data = await api('/api/billing/confirm', {
          method: 'POST',
          body: {
            ...(sessionId ? { sessionId } : {}),
            ...(returnPhase === 'commitment' ? { phase: 'commitment', markCommitment: true } : {}),
          },
        })
        if (cancelled) return
        if (data.user) updateUser(data.user)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          params.delete('carte')
          params.delete('session_id')
          params.delete('phase')
          const qs = params.toString()
          window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [updateUser])

  if (!phase || !user) return null

  const isCommitment = phase === 'commitment'
  const trialEndsAt = user.subscription?.trialEndsAt
  const commitmentEndsAt = commitmentEndDate(user.subscription)
  const days = trialDaysLeft(user.subscription?.activatedAt, 30, trialEndsAt)
  const left = calendarDaysUntil(isCommitment ? commitmentEndsAt : trialEndsAt)
  const overdue = user.subscription?.status === 'past_due'
  const currentPlanId = user.subscription?.plan || 'essentiel'
  const currentPlan = plans.find((item) => item.id === currentPlanId) || plans[0]
  const selectedPlan = plans.find((item) => item.id === planId) || currentPlan
  const changingPlan = planId !== currentPlanId
  const hasCard = Boolean(user.subscription?.hasPaymentMethod)
  const autoOn =
    hasCard &&
    (user.subscription?.collectionMethod === 'charge_automatically' || !user.subscription?.collectionMethod)

  async function choose(choice) {
    setError('')
    setOk('')
    setPending(choice)
    try {
      const data = await api('/api/billing/choice', {
        method: 'POST',
        body: {
          choice,
          plan: planId,
          phase,
          message:
            choice === 'stop'
              ? stopNote.trim() ||
                (isCommitment
                  ? 'Je souhaite arrêter Nolyo à la fin de mon engagement (carte retirée).'
                  : 'Je souhaite arrêter Nolyo à la fin de mon mois offert.')
              : undefined,
        },
      })
      if (data.url) {
        window.location.assign(data.url)
        return
      }
      if (data.user) updateUser(data.user)
      if (data.kept) {
        setOk(data.message || 'Parfait — on garde le même fonctionnement.')
        setTimeout(() => setPhase(null), 1800)
        return
      }
      if (data.choice === 'stop') {
        setOk(data.message || 'Carte retirée. Demande d’arrêt envoyée.')
        setTimeout(() => {
          setPhase(null)
          navigate('/dashboard/parametres?suppression=1')
        }, 1200)
        return
      }
      setPhase(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending('')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-moss/45 p-4 backdrop-blur-sm">
      <div className="max-h-[min(92vh,46rem)] w-full max-w-xl overflow-y-auto rounded-[1.6rem] bg-cream p-6 shadow-2xl ring-1 ring-ink/8 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-copper uppercase">
          {isCommitment
            ? left === 0
              ? 'Fin d’engagement'
              : `Engagement · dans ${Math.max(left, 0)} jour${left > 1 ? 's' : ''}`
            : overdue
              ? 'Suite de votre abonnement'
              : left === 0
                ? 'Dernier jour offert'
                : `Dans ${Math.max(left, 0)} jour${left > 1 ? 's' : ''}`}
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight">
          {isCommitment
            ? 'Vos 7 mois se terminent bientôt.'
            : overdue
              ? 'On prépare la suite, ensemble.'
              : 'Votre mois offert se termine bientôt.'}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {isCommitment
            ? 'Rien ne change sans vous. Choisissez de continuer comme aujourd’hui, de payer à la main, ou d’arrêter en retirant votre carte.'
            : 'Rien n’est prélevé sans votre choix. On vous prévient à l’avance — sans surprise le jour J.'}
        </p>

        <div className="mt-5 rounded-[1.25rem] bg-paper px-4 py-4 ring-1 ring-ink/8">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-copper uppercase">Aujourd’hui</p>
          <p className="mt-1 font-medium">
            Vous êtes sur <span className="text-moss">{planLabels[currentPlanId] || currentPlan.name}</span>
            {currentPlan ? ` · ${formatPrice(currentPlan.price)} / mois` : ''}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {isCommitment
              ? commitmentEndsAt
                ? `Engagement jusqu’au ${formatDay(commitmentEndsAt)}`
                : 'Fin d’engagement proche'
              : trialEndsAt
                ? `Mois offert jusqu’au ${formatDay(trialEndsAt)}`
                : 'Mois offert en cours'}
            {!isCommitment && !overdue && days > 0
              ? ` · ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`
              : ''}
          </p>
          {hasCard ? (
            <p className="mt-2 text-xs text-moss">Carte enregistrée · prélèvement {autoOn ? 'automatique actif' : 'manuel'}</p>
          ) : (
            <p className="mt-2 text-xs text-ink-soft">Aucune carte enregistrée pour le moment.</p>
          )}
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium">Quelle formule souhaitez-vous après ?</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={planId === plan.id}
                current={plan.id === currentPlanId}
                onSelect={setPlanId}
              />
            ))}
          </div>
          {changingPlan ? (
            <p className="mt-3 rounded-2xl bg-moss/8 px-3 py-2 text-xs text-moss">
              Vous passerez sur {selectedPlan.name} ({formatPrice(selectedPlan.price)} / mois).
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium">Comment souhaitez-vous payer ?</p>
          <button
            type="button"
            disabled={Boolean(pending)}
            onClick={() => choose('auto')}
            className={`${primaryBtn} w-full justify-center`}
          >
            {pending === 'auto'
              ? 'Un instant…'
              : isCommitment && autoOn
                ? 'Garder le même fonctionnement (prélèvement auto)'
                : 'Prélèvement automatique — enregistrer ma carte'}
          </button>
          <p className="px-1 text-xs leading-relaxed text-ink-soft">
            {isCommitment && autoOn
              ? 'Votre carte reste en place. Stripe continue de prélever chaque mois, comme aujourd’hui.'
              : `Recommandé. Stripe prélève ${formatPrice(selectedPlan.price)} / mois. Votre espace reste ouvert.`}
          </p>

          <button
            type="button"
            disabled={Boolean(pending)}
            onClick={() => choose('invoice')}
            className={`${quietBtn} w-full justify-center`}
          >
            {pending === 'invoice' ? 'Enregistrement…' : 'Je préfère payer chaque mois moi-même'}
          </button>
        </div>

        <div className="mt-6 border-t border-ink/8 pt-5">
          {!showStop ? (
            <button type="button" className="text-sm text-ink-soft underline" onClick={() => setShowStop(true)}>
              Je préfère arrêter Nolyo
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-ink-soft">
                {hasCard
                  ? 'On retirera d’abord votre carte bancaire, puis une demande d’arrêt partira au fondateur. S’il accepte, le compte est supprimé.'
                  : 'Une demande part au fondateur. S’il accepte, votre compte est supprimé.'}
              </p>
              <textarea
                className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-sm outline-none focus:border-copper"
                rows={3}
                value={stopNote}
                onChange={(event) => setStopNote(event.target.value)}
                placeholder="Un mot sur votre départ (optionnel)…"
              />
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() => choose('stop')}
                className="rounded-full bg-ink/90 px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
              >
                {pending === 'stop'
                  ? 'Traitement…'
                  : hasCard
                    ? 'Retirer ma carte et demander l’arrêt'
                    : 'Envoyer ma demande d’arrêt'}
              </button>
            </div>
          )}
        </div>

        <p className="mt-5 text-xs text-ink-soft">
          Suivi détaillé à tout moment dans{' '}
          <Link to="/dashboard/abonnement" className="underline" onClick={() => setPhase(null)}>
            Abonnement
          </Link>
          .
        </p>

        {ok ? <p className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">{ok}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      </div>
    </div>
  )
}
