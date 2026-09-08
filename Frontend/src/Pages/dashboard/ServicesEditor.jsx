import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { hasModule } from '../../data/workspace'
import { isQuoteService, servicePriceLabel } from '../../data/pageTheme'
import { fieldClass, formatMoney } from './format'
import { ghostBtn, primaryBtn, quietBtn } from './ui'

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]
const emptyForm = { name: '', price: '', durationMinutes: 60, kind: 'session' }
const QUOTE_DEFAULT = { name: 'Demande de devis', price: '0', durationMinutes: 30, kind: 'quote' }

export function ServicesEditor() {
  const { user } = useAuth()
  const isPro = isProPlan(user)
  const canQuote = isPro && hasModule(user, 'quotes')
  const [services, setServices] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function load() {
    const data = await api('/api/workspace/services')
    setServices(data.services || [])
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  function update(event) {
    const { name, value } = event.target
    setForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'kind' && value === 'quote' && !current.price) next.price = '0'
      return next
    })
  }

  function startEdit(item) {
    setEditingId(item._id)
    setForm({
      name: item.name,
      price: item.price === 0 ? '0' : String(item.price),
      durationMinutes: item.durationMinutes || 60,
      kind: item.kind === 'quote' ? 'quote' : 'session',
    })
    setError('')
  }

  function reset() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  function startQuote() {
    setEditingId(null)
    setForm({ ...QUOTE_DEFAULT })
    setError('')
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    const kind = form.kind === 'quote' ? 'quote' : 'session'
    const body = {
      name: form.name,
      kind,
      price: kind === 'quote' && !Number(form.price) ? 0 : Number(form.price),
      durationMinutes: Number(form.durationMinutes),
      active: editingId ? services.find((item) => item._id === editingId)?.active !== false : true,
    }
    try {
      if (editingId) {
        const data = await api(`/api/workspace/services/${editingId}`, { method: 'PATCH', body })
        setServices((current) => current.map((item) => (item._id === editingId ? data.service : item)))
      } else {
        const data = await api('/api/workspace/services', { method: 'POST', body })
        setServices((current) => [...current, data.service])
      }
      reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function toggleActive(item) {
    try {
      const data = await api(`/api/workspace/services/${item._id}`, {
        method: 'PATCH',
        body: {
          name: item.name,
          kind: item.kind === 'quote' ? 'quote' : 'session',
          price: item.price,
          durationMinutes: item.durationMinutes,
          active: !item.active,
        },
      })
      setServices((current) => current.map((entry) => (entry._id === item._id ? data.service : entry)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(id) {
    await api(`/api/workspace/services/${id}`, { method: 'DELETE' })
    setServices((current) => current.filter((item) => item._id !== id))
    if (editingId === id) reset()
  }

  const hasQuote = services.some((item) => isQuoteService(item))
  const quoteForm = form.kind === 'quote'

  return (
    <div>
      <p className="text-sm text-ink-soft">
        {isPro
          ? 'Ces prestations alimentent la page de réservation, et s’ajoutent en un clic sur une fiche client.'
          : 'Renseignez vos prestations ici. Sur une fiche client, cliquez-les pour composer le montant du devis.'}
      </p>
      {canQuote ? (
        <p className="mt-2 text-sm text-ink-soft">
          Une demande de devis se prend comme une prestation : le visiteur choisit un créneau pour cadrer le projet.
        </p>
      ) : null}
      {services.length ? (
        <ul className="mt-4 space-y-2">
          {services.map((item) => (
            <li key={item._id} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3">
              <div className="min-w-0">
                <p className={`truncate font-medium ${item.active ? '' : 'text-ink-soft'}`}>
                  {item.name}
                  {isQuoteService(item) ? (
                    <span className="ml-2 rounded-full bg-moss/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-moss uppercase">
                      Devis
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-ink-soft">
                  {item.durationMinutes} min · {servicePriceLabel(item, formatMoney)}
                  {item.active ? '' : ' · masquée'}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" className={quietBtn} onClick={() => toggleActive(item)}>
                  {item.active ? 'Masquer' : 'Afficher'}
                </button>
                <button type="button" className={quietBtn} onClick={() => startEdit(item)}>
                  Modifier
                </button>
                <button type="button" className={quietBtn} onClick={() => remove(item._id)}>
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">Aucune prestation pour l’instant.</p>
      )}

      {canQuote && !hasQuote && !editingId ? (
        <button type="button" className={`${ghostBtn} mt-4`} onClick={startQuote}>
          Ajouter une demande de devis
        </button>
      ) : null}

      <form onSubmit={save} className="mt-6 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium sm:col-span-3">
          {editingId ? 'Modifier la prestation' : 'Nouvelle prestation'}
          <input
            className={fieldClass}
            name="name"
            value={form.name}
            onChange={update}
            required
            placeholder={quoteForm ? 'Demande de devis' : 'Rituel visage'}
          />
        </label>
        {isPro ? (
          <label className="block text-sm font-medium sm:col-span-3">
            Type
            <select className={fieldClass} name="kind" value={form.kind} onChange={update}>
              <option value="session">Prestation tarifée</option>
              <option value="quote">Demande de devis — sur rendez-vous</option>
            </select>
          </label>
        ) : null}
        {quoteForm ? (
          <p className="text-sm text-ink-soft sm:col-span-3">
            Le visiteur doit prendre un créneau pour parler du projet. Le devis se prépare ensuite, dans Nolyo.
          </p>
        ) : null}
        <label className="block text-sm font-medium">
          Prix (€)
          <input
            className={fieldClass}
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={update}
            required={!quoteForm}
            placeholder={quoteForm ? '0' : ''}
          />
        </label>
        <label className="block text-sm font-medium">
          Durée
          <select className={fieldClass} name="durationMinutes" value={form.durationMinutes} onChange={update}>
            {DURATION_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} min
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3">
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}
          </button>
          {editingId || quoteForm ? (
            <button type="button" className={ghostBtn} onClick={reset}>
              Annuler
            </button>
          ) : null}
        </div>
      </form>
      {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
    </div>
  )
}
