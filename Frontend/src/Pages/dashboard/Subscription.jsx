import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatPrice, planLabels, plans } from '../../data/plans'
import { billingLabel } from '../../data/billing'
import { formatDay } from './format'
import { PageHeader, PageShell, primaryBtn, ghostBtn } from './ui'

function brandLabel(brand) {
  if (!brand) return 'Carte'
  const map = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' }
  return map[String(brand).toLowerCase()] || brand
}

const proPlan = plans.find((item) => item.id === 'pro')

function Subscription() {
  const { user, updateUser } = useAuth()
  const { toast, confirm } = useToast()
  const [params, setParams] = useSearchParams()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    const data = await api('/api/billing/overview')
    setInfo(data)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (params.get('carte') !== '1') return undefined
    const sessionId = params.get('session_id') || ''
    let cancelled = false
    setBusy('confirm')
    ;(async () => {
      try {
        const data = await api('/api/billing/confirm', {
          method: 'POST',
          body: sessionId ? { sessionId } : {},
        })
        if (cancelled) return
        if (data.user) updateUser(data.user)
        setOk('Carte enregistrée. Le prélèvement automatique est prêt.')
        toast({
          tone: 'success',
          title: 'Carte enregistrée',
          description: 'Le prélèvement automatique est prêt.',
        })
        await load()
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          toast({ tone: 'error', title: 'Carte', description: err.message })
        }
      } finally {
        if (!cancelled) {
          setBusy('')
          const next = new URLSearchParams(params)
          next.delete('carte')
          next.delete('session_id')
          setParams(next, { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params, setParams, updateUser, toast])

  const sub = info?.subscription || user?.subscription || {}
  const card = info?.card
  const month = info?.monthPayment
  const planName = sub.planName || planLabels[sub.plan] || 'Nolyo'
  const canUpgrade = sub.plan === 'essentiel' && !sub.upgradedToProAt

  async function addCard() {
    setError('')
    setOk('')
    setBusy('card')
    try {
      const data = await api('/api/billing/setup-card', { method: 'POST', body: { fromPage: true } })
      if (data.url) window.location.assign(data.url)
      else {
        setError('Lien Stripe introuvable.')
        toast({ tone: 'error', title: 'Carte', description: 'Lien Stripe introuvable.' })
      }
    } catch (err) {
      setError(err.message)
      toast({ tone: 'error', title: 'Carte', description: err.message })
      setBusy('')
    }
  }

  async function removeCard() {
    const approved = await confirm({
      title: 'Retirer la carte ?',
      description: 'Les prélèvements automatiques s’arrêteront. Vous pourrez en ajouter une autre plus tard.',
      confirmLabel: 'Retirer la carte',
      cancelLabel: 'Garder la carte',
      tone: 'danger',
    })
    if (!approved) return
    setError('')
    setOk('')
    setBusy('remove')
    try {
      const data = await api('/api/billing/remove-card', { method: 'POST' })
      if (data.user) updateUser(data.user)
      setOk('Carte retirée.')
      toast({ tone: 'success', title: 'Carte retirée', description: 'Les prélèvements automatiques sont arrêtés.' })
      await load()
    } catch (err) {
      setError(err.message)
      toast({ tone: 'error', title: 'Carte', description: err.message })
    } finally {
      setBusy('')
    }
  }

  async function upgradeToPro() {
    const approved = await confirm({
      kicker: 'Nolyo Pro',
      title: 'Passer à Nolyo Pro ?',
      description: `Formule à ${proPlan ? formatPrice(proPlan.price) : '19,99 €'} / mois. Vos clients, agenda et notes sont conservés.`,
      bullets: [
        'Pendant le mois offert : sans surcoût',
        'En abonnement payant : la différence du mois en cours est prélevée',
        'Ensuite toujours le tarif Pro — pas de retour à Essentiel',
      ],
      confirmLabel: 'Passer à Pro',
      cancelLabel: 'Rester sur Essentiel',
      tone: 'pro',
    })
    if (!approved) return
    setError('')
    setOk('')
    setBusy('upgrade')
    try {
      const data = await api('/api/billing/upgrade', { method: 'POST', body: { plan: 'pro' } })
      if (data.user) updateUser(data.user)
      const message = data.message || 'Vous êtes passé à Nolyo Pro. Vos données sont conservées.'
      setOk(message)
      toast({
        tone: 'pro',
        title: 'Bienvenue sur Nolyo Pro',
        description: message,
        duration: 6500,
        action:
          data.hostedInvoiceUrl && !data.user?.subscription?.hasPaymentMethod
            ? {
                label: 'Ouvrir la facture',
                onClick: () => window.open(data.hostedInvoiceUrl, '_blank', 'noopener,noreferrer'),
              }
            : undefined,
      })
      await load()
    } catch (err) {
      setError(err.message)
      toast({ tone: 'error', title: 'Upgrade', description: err.message })
    } finally {
      setBusy('')
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Abonnement"
        description="Formule, prochaine facture, carte et statut du mois — tout est là, clairement."
      />

      {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {ok ? <p className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">{ok}</p> : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/8 sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Formule</p>
          <h2 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">{planName}</h2>
          <p className="mt-1 text-ink-soft">
            {sub.amount ? `${formatPrice(sub.amount)} / mois` : '—'} · {billingLabel(sub.status)}
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="min-w-0 text-ink-soft">Mois offert jusqu’au</dt>
              <dd className="shrink-0 font-medium">{formatDay(sub.trialEndsAt) || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Engagement jusqu’au</dt>
              <dd className="font-medium">{formatDay(sub.commitmentEndsAt) || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Prochaine facture</dt>
              <dd className="font-medium">{formatDay(sub.nextInvoiceAt || sub.currentPeriodEnd) || '—'}</dd>
            </div>
            {sub.paidAt ? (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Dernier paiement</dt>
                <dd className="font-medium">{formatDay(sub.paidAt)}</dd>
              </div>
            ) : null}
          </dl>
          {canUpgrade ? (
            <div className="mt-6 rounded-2xl bg-paper px-4 py-4 ring-1 ring-ink/8">
              <p className="font-medium">Passer à Nolyo Pro</p>
              <p className="mt-1 text-sm text-ink-soft">
                {proPlan ? `${formatPrice(proPlan.price)} / mois` : '19,99 € / mois'} — page pro, réservation, QR et
                stats. Clients et agenda restent. Pendant le mois offert : gratuit. Ensuite : différence du mois en
                cours, puis tarif Pro. Irréversible (pas de retour à Essentiel).
              </p>
              <button
                type="button"
                disabled={Boolean(busy)}
                className={`${primaryBtn} mt-4`}
                onClick={upgradeToPro}
              >
                {busy === 'upgrade' ? 'Passage en cours…' : 'Passer à Pro'}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/8 sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Ce mois-ci</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">
            {month?.status === 'paid' || month?.status === 'ok' || month?.status === 'trial'
              ? 'Tout est en ordre'
              : month?.status === 'due'
                ? 'Action requise'
                : 'Suivi'}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">{month?.label || 'Chargement…'}</p>
          {sub.autoDebit ? (
            <p className="mt-4 rounded-2xl bg-moss/10 px-3 py-2 text-sm text-moss">Prélèvement automatique actif</p>
          ) : sub.hasPaymentMethod ? (
            <p className="mt-4 rounded-2xl bg-paper px-3 py-2 text-sm text-ink-soft">
              Carte enregistrée · paiement manuel à chaque échéance
            </p>
          ) : (
            <p className="mt-4 rounded-2xl bg-paper px-3 py-2 text-sm text-ink-soft">
              Aucune carte — ajoutez-en une pour le prélèvement auto
            </p>
          )}
          {info?.hostedInvoiceUrl ? (
            <a
              href={info.hostedInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className={`${primaryBtn} mt-5 inline-flex`}
            >
              Régler la facture ouverte
            </a>
          ) : null}
        </section>

        <section className="rounded-[1.5rem] bg-cream p-5 ring-1 ring-ink/8 sm:p-6 lg:col-span-2">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Moyen de paiement</p>
          {card?.last4 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {brandLabel(card.brand)} ···· {card.last4}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  Expire {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={Boolean(busy)} className={ghostBtn} onClick={addCard}>
                  {busy === 'card' ? 'Redirection…' : 'Changer de carte'}
                </button>
                <button type="button" disabled={Boolean(busy)} className={ghostBtn} onClick={removeCard}>
                  {busy === 'remove' ? 'Retrait…' : 'Retirer la carte'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-ink-soft">
                Aucune carte enregistrée. Stripe gère le paiement — Nolyo ne voit jamais le numéro complet.
              </p>
              <button type="button" disabled={Boolean(busy)} className={primaryBtn} onClick={addCard}>
                {busy === 'card' ? 'Redirection…' : 'Ajouter une carte'}
              </button>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}

export default Subscription
