import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { fieldClass, toDatetimeLocal } from '../dashboard/format'
import { PageShell, Surface, primaryBtn, ghostBtn } from '../dashboard/ui'

function toInputValue(value) {
  if (!value) return ''
  return toDatetimeLocal(value)
}

function fromInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function MaintenanceView() {
  const { toast, confirm } = useToast()
  const [form, setForm] = useState({
    mode: 'coming_soon',
    title: '',
    message: '',
    startsAt: '',
    endsAt: '',
  })
  const [meta, setMeta] = useState(null)
  const [notifySubscribers, setNotifySubscribers] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const data = await api('/api/president/site-settings')
    const settings = data.settings || {}
    setForm({
      mode: settings.mode || 'live',
      title: settings.title || '',
      message: settings.message || '',
      startsAt: toInputValue(settings.startsAt),
      endsAt: toInputValue(settings.endsAt),
    })
    setMeta(settings)
    setNotifySubscribers(false)
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')

    if (form.mode === 'maintenance' && notifySubscribers) {
      const ok = await confirm({
        kicker: 'Maintenance',
        title: 'Prévenir les abonnés ?',
        description:
          'Un e-mail sera envoyé à tous les membres avec un abonnement actif ou en mois offert, avec les dates de maintenance.',
        confirmLabel: 'Enregistrer et envoyer',
        cancelLabel: 'Annuler',
        tone: 'pro',
      })
      if (!ok) return
    }

    setPending(true)
    try {
      const data = await api('/api/president/site-settings', {
        method: 'PATCH',
        body: {
          mode: form.mode,
          title: form.title,
          message: form.message,
          startsAt: fromInputValue(form.startsAt),
          endsAt: fromInputValue(form.endsAt),
          notifySubscribers: form.mode === 'maintenance' && notifySubscribers,
        },
      })
      const settings = data.settings || {}
      setForm({
        mode: settings.mode || 'live',
        title: settings.title || '',
        message: settings.message || '',
        startsAt: toInputValue(settings.startsAt),
        endsAt: toInputValue(settings.endsAt),
      })
      setMeta(settings)
      setNotifySubscribers(false)
      toast({
        tone: 'success',
        title: 'Site mis à jour',
        description:
          data.notified > 0
            ? `${data.notified} abonné${data.notified > 1 ? 's' : ''} prévenu${data.notified > 1 ? 's' : ''} par e-mail.`
            : form.mode === 'live'
              ? 'Le site public est ouvert.'
              : form.mode === 'coming_soon'
                ? 'Page « bientôt » active sur nolyo.fr.'
                : 'Mode maintenance enregistré.',
      })
    } catch (err) {
      setError(err.message)
      toast({ tone: 'error', title: 'Site', description: err.message })
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">Chargement…</p>
  }

  return (
    <PageShell className="!px-0 !py-0">
      <div className="max-w-2xl">
        <p className="text-sm text-ink-soft">
          Contrôlez ce que voient les visiteurs sur nolyo.fr. L’admin fondateur et les connexions membres restent
          accessibles.
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-8 max-w-2xl space-y-5">
        <Surface className="space-y-4 p-6">
          <label className="block text-sm font-semibold">
            État du site
            <select name="mode" value={form.mode} onChange={update} className={fieldClass}>
              <option value="live">Ouvert (site normal)</option>
              <option value="coming_soon">Bientôt disponible</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Titre (optionnel)
            <input
              name="title"
              value={form.title}
              onChange={update}
              className={fieldClass}
              maxLength={120}
              placeholder={form.mode === 'maintenance' ? 'Maintenance en cours' : 'Nolyo arrive bientôt'}
            />
          </label>

          <label className="block text-sm font-semibold">
            Message
            <textarea
              name="message"
              value={form.message}
              onChange={update}
              className={`${fieldClass} min-h-28 resize-y`}
              maxLength={800}
              placeholder="Expliquez brièvement la situation aux visiteurs."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Début
              <input
                type="datetime-local"
                name="startsAt"
                value={form.startsAt}
                onChange={update}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-semibold">
              Fin
              <input type="datetime-local" name="endsAt" value={form.endsAt} onChange={update} className={fieldClass} />
            </label>
          </div>
          <p className="text-xs text-ink-soft">
            Horaires selon votre fuseau local. Laissez vide pour une page « bientôt » sans échéance, ou une maintenance
            immédiate jusqu’à désactivation.
          </p>

          {form.mode === 'maintenance' ? (
            <label className="flex items-start gap-3 rounded-2xl bg-paper px-4 py-3 text-sm ring-1 ring-ink/8">
              <input
                type="checkbox"
                className="mt-1"
                checked={notifySubscribers}
                onChange={(event) => setNotifySubscribers(event.target.checked)}
              />
              <span>
                <span className="font-semibold text-ink">Prévenir les abonnés par e-mail</span>
                <span className="mt-0.5 block text-ink-soft">
                  Envoi aux comptes avec abonnement actif ou mois offert, avec les dates renseignées.
                </span>
              </span>
            </label>
          ) : null}
        </Surface>

        {meta?.lastNotifiedAt ? (
          <p className="text-xs text-ink-soft">
            Dernier e-mail abonnés :{' '}
            {new Date(meta.lastNotifiedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        ) : null}

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {form.mode !== 'live' ? (
            <button
              type="button"
              className={ghostBtn}
              disabled={pending}
              onClick={() => setForm((current) => ({ ...current, mode: 'live' }))}
            >
              Remettre ouvert
            </button>
          ) : null}
        </div>
      </form>
    </PageShell>
  )
}

export default MaintenanceView
