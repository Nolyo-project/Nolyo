import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { hasModule } from '../../data/workspace'
import { isHeadingService, isQuoteService, servicePriceLabel } from '../../data/pageTheme'
import { fieldClass, formatMoney } from './format'
import { ghostBtn, primaryBtn, quietBtn } from './ui'

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]
const emptyForm = { name: '', price: '', durationMinutes: 60, kind: 'session', headingId: '' }
const QUOTE_DEFAULT = { name: 'Demande de devis', price: '0', durationMinutes: 30, kind: 'quote', headingId: '' }
const HEADING_DEFAULT = { name: '', price: '0', durationMinutes: 0, kind: 'heading', headingId: '' }

export function ServicesEditor() {
  const { user } = useAuth()
  const isPro = isProPlan(user)
  const canQuote = isPro && hasModule(user, 'quotes')
  const [services, setServices] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const headings = services.filter(isHeadingService)

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
      if (name === 'kind' && value === 'heading') {
        next.price = '0'
        next.durationMinutes = 0
        next.headingId = ''
      }
      return next
    })
  }

  function startEdit(item) {
    setEditingId(item._id)
    setForm({
      name: item.name,
      price: item.price === 0 ? '0' : String(item.price),
      durationMinutes: item.kind === 'heading' ? 0 : item.durationMinutes || 60,
      kind: item.kind === 'quote' ? 'quote' : item.kind === 'heading' ? 'heading' : 'session',
      headingId: item.headingId ? String(item.headingId) : '',
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

  function startHeading() {
    setEditingId(null)
    setForm({ ...HEADING_DEFAULT })
    setError('')
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    const kind = form.kind === 'quote' ? 'quote' : form.kind === 'heading' ? 'heading' : 'session'
    const body = {
      name: form.name,
      kind,
      price: kind === 'heading' || (kind === 'quote' && !Number(form.price)) ? 0 : Number(form.price),
      durationMinutes: kind === 'heading' ? 0 : Number(form.durationMinutes),
      active: editingId ? services.find((item) => item._id === editingId)?.active !== false : true,
      headingId: kind === 'heading' ? null : form.headingId || null,
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
          kind: item.kind === 'quote' ? 'quote' : item.kind === 'heading' ? 'heading' : 'session',
          price: item.price,
          durationMinutes: item.durationMinutes,
          active: !item.active,
          headingId: item.headingId || null,
        },
      })
      setServices((current) => current.map((entry) => (entry._id === item._id ? data.service : entry)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(id) {
    await api(`/api/workspace/services/${id}`, { method: 'DELETE' })
    setServices((current) =>
      current
        .filter((item) => item._id !== id)
        .map((item) => (String(item.headingId) === String(id) ? { ...item, headingId: null } : item)),
    )
    if (editingId === id) reset()
  }

  const hasQuote = services.some((item) => isQuoteService(item))
  const quoteForm = form.kind === 'quote'
  const headingForm = form.kind === 'heading'

  function headingName(id) {
    if (!id) return ''
    return headings.find((item) => String(item._id) === String(id))?.name || ''
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">
        Titres et prestations affichés sur votre page pro et à la réservation. Affiliez chaque prestation à un titre.
      </p>
      {canQuote ? (
        <p className="mt-2 text-sm text-ink-soft">
          Une demande de devis se prend comme une prestation : le visiteur choisit un créneau pour cadrer le projet.
        </p>
      ) : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {services.length ? (
        <ul className="mt-4 space-y-2">
          {services.map((item) => (
            <li
              key={item._id}
              className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
                isHeadingService(item) ? 'bg-moss/5 ring-1 ring-moss/10' : 'bg-paper'
              }`}
            >
              <div className="min-w-0">
                <p className={`truncate font-medium ${item.active ? '' : 'text-ink-soft'}`}>
                  {isHeadingService(item) ? (
                    <span className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">
                      {item.name}
                    </span>
                  ) : (
                    item.name
                  )}
                  {isQuoteService(item) ? (
                    <span className="ml-2 rounded-full bg-moss/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-moss uppercase">
                      Devis
                    </span>
                  ) : null}
                  {isHeadingService(item) ? (
                    <span className="ml-2 rounded-full bg-copper/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-copper uppercase">
                      Titre
                    </span>
                  ) : null}
                </p>
                {!isHeadingService(item) ? (
                  <p className="text-xs text-ink-soft">
                    {item.durationMinutes} min · {servicePriceLabel(item, formatMoney)}
                    {headingName(item.headingId) ? ` · ${headingName(item.headingId)}` : ''}
                    {item.active ? '' : ' · masquée'}
                  </p>
                ) : (
                  <p className="text-xs text-ink-soft">{item.active ? 'Section sur la page pro' : 'Section masquée'}</p>
                )}
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

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={ghostBtn} onClick={startHeading}>
          Ajouter un titre
        </button>
        {canQuote && !hasQuote && !editingId ? (
          <button type="button" className={ghostBtn} onClick={startQuote}>
            Ajouter une demande de devis
          </button>
        ) : null}
      </div>

      <form onSubmit={save} className="mt-6 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium sm:col-span-3">
          {editingId
            ? headingForm
              ? 'Modifier le titre'
              : 'Modifier la prestation'
            : headingForm
              ? 'Nouveau titre de section'
              : 'Nouvelle prestation'}
          <input
            className={fieldClass}
            name="name"
            value={form.name}
            onChange={update}
            required
            placeholder={headingForm ? 'Massage, Coiffure femme…' : quoteForm ? 'Demande de devis' : 'Rituel visage'}
          />
        </label>
        {isPro && !headingForm ? (
          <label className="block text-sm font-medium sm:col-span-3">
            Type
            <select className={fieldClass} name="kind" value={form.kind} onChange={update}>
              <option value="session">Prestation tarifée</option>
              <option value="quote">Demande de devis — sur rendez-vous</option>
            </select>
          </label>
        ) : null}
        {!headingForm ? (
          <label className="block text-sm font-medium sm:col-span-3">
            Titre de section
            <select className={fieldClass} name="headingId" value={form.headingId} onChange={update}>
              <option value="">Sans titre</option>
              {headings.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
            {!headings.length ? (
              <span className="mt-1 block text-xs text-ink-soft">Ajoutez d’abord un titre pour regrouper vos prestations.</span>
            ) : null}
          </label>
        ) : (
          <p className="text-sm text-ink-soft sm:col-span-3">
            Les prestations affiliées à ce titre apparaîtront sous cette section sur la page.
          </p>
        )}
        {quoteForm ? (
          <p className="text-sm text-ink-soft sm:col-span-3">
            Le visiteur doit prendre un créneau pour parler du projet. Le devis se prépare ensuite, dans Nolyo.
          </p>
        ) : null}
        {!headingForm ? (
          <>
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
          </>
        ) : null}
        <div className={`flex items-end gap-3 ${headingForm ? 'sm:col-span-3' : ''}`}>
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? 'Enregistrement…' : editingId ? 'Enregistrer' : headingForm ? 'Ajouter le titre' : 'Ajouter'}
          </button>
          {editingId || quoteForm || headingForm ? (
            <button type="button" className={ghostBtn} onClick={reset}>
              Annuler
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
