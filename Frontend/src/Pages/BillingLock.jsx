import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { hasWorkspaceAccess, needsPayment } from '../data/billing'
import { formatPrice } from '../data/plans'
import { useAuth } from '../context/AuthContext'
import { formatDay } from './dashboard/format'
import { primaryBtn } from './dashboard/ui'

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function BillingLock() {
  const { user, updateUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    api('/api/billing/status')
      .then(setInfo)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const paid = params.get('paid') === '1'
    const sessionId = params.get('session_id') || ''
    if (!paid && !sessionId) return undefined

    let cancelled = false
    setConfirming(true)
    setError('')

    ;(async () => {
      try {
        let data = null
        // Webhook Stripe peut arriver avec un léger décalage : on retente
        for (let attempt = 0; attempt < 6; attempt += 1) {
          data = await api('/api/billing/confirm', {
            method: 'POST',
            body: sessionId ? { sessionId } : {},
          })
          if (cancelled) return
          if (data.user) updateUser(data.user)
          if (data.paid || data.access) {
            navigate('/dashboard', { replace: true })
            return
          }
          await sleep(1200)
        }
        if (refreshUser) await refreshUser()
        setError('Paiement reçu par Stripe, confirmation en cours. Réessayez « J’ai payé » dans un instant.')
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setConfirming(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params, updateUser, refreshUser, navigate])

  if (user?.role === 'president') return <Navigate to="/" replace />
  if (hasWorkspaceAccess(user) && !needsPayment(user) && !confirming) {
    return <Navigate to="/dashboard" replace />
  }

  const sub = info?.subscription || user.subscription || {}
  const invoiceMode =
    sub.billingChoice === 'invoice' || sub.collectionMethod === 'send_invoice'

  async function startCheckout() {
    setError('')
    setPaying(true)
    try {
      const data = await api('/api/billing/checkout', { method: 'POST' })
      if (data.alreadyPaid) {
        if (data.user) updateUser(data.user)
        navigate('/dashboard', { replace: true })
        return
      }
      if (data.url) {
        window.location.assign(data.url)
        return
      }
      setError('Lien de paiement introuvable.')
    } catch (err) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  async function refreshAfterPay() {
    setError('')
    setConfirming(true)
    try {
      const data = await api('/api/billing/confirm', { method: 'POST', body: {} })
      if (data.user) updateUser(data.user)
      if (data.paid || data.access) {
        navigate('/dashboard', { replace: true })
        return
      }
      setError('Paiement pas encore visible. Réessayez dans un instant.')
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-moss/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-[1.6rem] bg-cream p-5 shadow-2xl ring-1 ring-ink/8 sm:rounded-[1.6rem] sm:p-8">
        <p className="text-xs font-semibold tracking-[0.22em] text-copper uppercase">Accès bloqué</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {confirming ? 'Confirmation du paiement…' : 'Jour J — réglez votre mois.'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {confirming
            ? 'Retour depuis Stripe : on vérifie le règlement avec Stripe, on enregistre le paiement, puis on rouvre votre tableau de bord.'
            : invoiceMode
              ? 'Vous avez choisi de payer chaque mois vous-même. Le mois offert est terminé : un seul paiement Stripe ouvre à nouveau l’espace. Impossible de payer deux fois la même facture.'
              : 'Sans règlement, le tableau de bord reste verrouillé. Stripe encaisse une seule fois la facture due, puis vous revient ici automatiquement.'}
          {!confirming && sub.trialEndsAt ? ` Fin de l’essai : ${formatDay(sub.trialEndsAt)}.` : ''}
        </p>

        {sub.planName || sub.plan ? (
          <div className="mt-6 rounded-3xl bg-paper px-5 py-5 ring-1 ring-ink/8">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">À régler</p>
            <p className="mt-2 font-display text-2xl sm:text-3xl">{sub.planName || 'Nolyo'}</p>
            {sub.amount ? <p className="mt-1 text-ink-soft">{formatPrice(sub.amount)} / mois</p> : null}
            {invoiceMode ? (
              <p className="mt-2 text-xs text-ink-soft">Mode : paiement manuel chaque mois</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={paying || confirming}
            onClick={startCheckout}
            className={`${primaryBtn} flex w-full justify-center`}
          >
            {paying
              ? 'Redirection Stripe…'
              : confirming
                ? 'Vérification…'
                : invoiceMode
                  ? 'Payer ma facture'
                  : 'Payer et déverrouiller'}
          </button>
          <button
            type="button"
            className="w-full text-sm text-ink-soft underline"
            disabled={confirming || paying}
            onClick={refreshAfterPay}
          >
            J’ai payé — actualiser
          </button>
          <Link to="/" className="block text-center text-sm text-ink-soft underline">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BillingLock
