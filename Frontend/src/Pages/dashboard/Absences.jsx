import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { fieldClass, formatLongDate } from './format'
import { EmptyState, Modal, PageHeader, PageShell, Surface, ghostBtn, primaryBtn, quietBtn } from './ui'

const KIND_OPTIONS = [
  { id: 'vacation', label: 'Vacances' },
  { id: 'sick', label: 'Arrêt / maladie' },
  { id: 'personal', label: 'Personnel' },
  { id: 'other', label: 'Autre' },
]

const kindLabel = Object.fromEntries(KIND_OPTIONS.map((item) => [item.id, item.label]))

function todayIso() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function emptyForm() {
  const day = todayIso()
  return { title: 'Vacances', kind: 'vacation', startDate: day, endDate: day, note: '' }
}

function rangeLabel(startDate, endDate) {
  if (startDate === endDate) return formatLongDate(`${startDate}T12:00:00`)
  return `${formatLongDate(`${startDate}T12:00:00`)} → ${formatLongDate(`${endDate}T12:00:00`)}`
}

function Absences() {
  const [absences, setAbsences] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [tab, setTab] = useState('upcoming')

  async function load() {
    const data = await api('/api/workspace/absences')
    setAbsences(data.absences || [])
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const today = todayIso()

  const upcoming = useMemo(
    () => absences.filter((item) => item.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [absences, today],
  )
  const past = useMemo(
    () => absences.filter((item) => item.endDate < today).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [absences, today],
  )

  const visible = tab === 'past' ? past : upcoming

  function update(event) {
    const { name, value } = event.target
    setForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'startDate' && next.endDate < value) next.endDate = value
      if (name === 'kind' && !editingId && (current.title === 'Vacances' || KIND_OPTIONS.some((k) => k.label === current.title))) {
        next.title = kindLabel[value] || current.title
      }
      return next
    })
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setError('')
    setOpen(true)
  }

  function openEdit(item) {
    setEditingId(item._id)
    setForm({
      title: item.title,
      kind: item.kind || 'vacation',
      startDate: item.startDate,
      endDate: item.endDate,
      note: item.note || '',
    })
    setError('')
    setOpen(true)
  }

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      if (editingId) {
        const data = await api(`/api/workspace/absences/${editingId}`, { method: 'PATCH', body: form })
        setAbsences((current) => current.map((row) => (row._id === editingId ? data.absence : row)))
      } else {
        const data = await api('/api/workspace/absences', { method: 'POST', body: form })
        setAbsences((current) => [...current, data.absence])
        setTab('upcoming')
      }
      closeForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette absence ? Les créneaux redeviendront réservables.')) return
    await api(`/api/workspace/absences/${id}`, { method: 'DELETE' })
    setAbsences((current) => current.filter((item) => item._id !== id))
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Agenda"
        title="Congés"
        description="Bloquez des jours (vacances, arrêt, etc.). Sur ces dates, la réservation en ligne est fermée. Si l’absence couvre aujourd’hui, une banderole s’affiche sur votre page publique (sans le motif)."
        actions={
          <button type="button" onClick={openCreate} className={primaryBtn}>
            Ajouter une absence
          </button>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">À venir</p>
          <p className="mt-2 font-display text-3xl tracking-tight">{upcoming.length}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Passées</p>
          <p className="mt-2 font-display text-3xl tracking-tight">{past.length}</p>
        </Surface>
      </section>

      <div className="mt-8 flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-cream p-1 ring-1 ring-ink/6">
        <button
          type="button"
          onClick={() => setTab('upcoming')}
          className={`rounded-full px-4 py-2 text-sm ${tab === 'upcoming' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'}`}
        >
          À venir ({upcoming.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('past')}
          className={`rounded-full px-4 py-2 text-sm ${tab === 'past' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'}`}
        >
          Passées ({past.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState>
            {tab === 'past'
              ? 'Aucune absence passée pour l’instant.'
              : 'Aucune absence planifiée. Ajoutez vos vacances pour fermer la réservation ces jours-là.'}
            {tab === 'upcoming' ? (
              <button type="button" onClick={openCreate} className={`${primaryBtn} mt-4`}>
                Ajouter une absence
              </button>
            ) : null}
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {visible.map((item) => (
            <li key={item._id}>
              <Surface className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{item.title}</p>
                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                      {kindLabel[item.kind] || 'Absence'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{rangeLabel(item.startDate, item.endDate)}</p>
                  {item.startDate <= today && item.endDate >= today ? (
                    <p className="mt-2 text-xs font-medium text-moss">Visible maintenant sur votre page publique</p>
                  ) : null}
                  {item.note ? <p className="mt-2 text-sm text-ink-soft">{item.note}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" className={quietBtn} onClick={() => openEdit(item)}>
                    Modifier
                  </button>
                  <button type="button" className={ghostBtn} onClick={() => handleDelete(item._id)}>
                    Supprimer
                  </button>
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <Modal onClose={closeForm} panelClassName="max-w-lg">
          <h2 className="font-display text-2xl tracking-tight">
            {editingId ? 'Modifier l’absence' : 'Nouvelle absence'}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Jours entiers, inclus du début à la fin.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Type
              <select name="kind" value={form.kind} onChange={update} className={fieldClass}>
                {KIND_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Libellé
              <input name="title" value={form.title} onChange={update} className={fieldClass} required maxLength={120} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Du
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={update}
                  className={fieldClass}
                  required
                />
              </label>
              <label className="block text-sm font-semibold">
                Au
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={update}
                  className={fieldClass}
                  required
                />
              </label>
            </div>
            <label className="block text-sm font-semibold">
              Note (optionnel)
              <textarea
                name="note"
                value={form.note}
                onChange={update}
                className={`${fieldClass} min-h-24 resize-y`}
                maxLength={500}
              />
            </label>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" onClick={closeForm} className={quietBtn}>
                Annuler
              </button>
              <button type="submit" disabled={pending} className={primaryBtn}>
                {pending ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  )
}

export default Absences
