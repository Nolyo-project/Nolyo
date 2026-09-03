import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { fieldClass, formatDateTime } from './format'
import { EmptyState, PageHeader, PageShell, Surface, icons, primaryBtn, quietBtn } from './ui'

const empty = { title: '', body: '', contact: '' }

function Notes() {
  const [notes, setNotes] = useState([])
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function load() {
    const [carnet, data] = await Promise.all([
      api('/api/workspace/contacts'),
      api('/api/notes'),
    ])
    setContacts(carnet.contacts || [])
    setNotes(data.notes || [])
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return notes.filter((note) => {
      const contactId = note.contact?._id || note.contact || ''
      if (clientFilter === 'none' && contactId) return false
      if (clientFilter && clientFilter !== 'none' && contactId !== clientFilter) return false
      if (!needle) return true
      return [note.title, note.body, note.contact?.name, note.contact?.company]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
    })
  }, [clientFilter, notes, query])

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(empty)
    setError('')
    setOpen(true)
  }

  function openEdit(note) {
    setEditingId(note._id)
    setForm({
      title: note.title,
      body: note.body || '',
      contact: note.contact?._id || '',
    })
    setError('')
    setOpen(true)
  }

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setForm(empty)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    const body = {
      title: form.title,
      body: form.body,
      contact: form.contact || null,
    }
    try {
      if (editingId) {
        const data = await api(`/api/notes/${editingId}`, { method: 'PATCH', body })
        setNotes((current) => current.map((item) => (item._id === editingId ? data.note : item)))
      } else {
        const data = await api('/api/notes', { method: 'POST', body })
        setNotes((current) => [data.note, ...current])
      }
      closeForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id) {
    await api(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes((current) => current.filter((note) => note._id !== id))
    if (editingId === id) closeForm()
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Carnet"
        title="Notes"
        description={`${filtered.length} note${filtered.length > 1 ? 's' : ''} — liez-les à un client si besoin.`}
        actions={
          <button type="button" onClick={openCreate} className={primaryBtn}>
            Nouvelle note
          </button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rechercher une note</span>
          <input
            className="w-full rounded-full border border-ink/10 bg-cream py-2.5 pr-4 pl-10 text-sm outline-none ring-1 ring-ink/5 transition focus:border-copper focus:ring-copper/20"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une note"
          />
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft">
            {icons.search}
          </span>
        </label>
        <select
          className="rounded-full border border-ink/10 bg-cream px-4 py-2.5 text-sm outline-none ring-1 ring-ink/5 focus:border-copper"
          value={clientFilter}
          onChange={(event) => setClientFilter(event.target.value)}
        >
          <option value="">Tous les contacts</option>
          <option value="none">Sans contact</option>
          {contacts.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
              {item.kind === 'prospect' ? ' · prospect' : ''}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState>
            {query || clientFilter
              ? 'Aucune note ne correspond.'
              : 'Aucune note pour l’instant. Posez la première.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <Surface
              as="li"
              key={note._id}
              className="flex cursor-pointer flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <button type="button" className="flex flex-1 flex-col text-left" onClick={() => openEdit(note)}>
                {note.contact?.name ? (
                  <span className="mb-2 w-fit rounded-full bg-moss/10 px-2.5 py-1 text-[11px] font-semibold text-moss">
                    {note.contact.name}
                  </span>
                ) : null}
                <h2 className="font-medium">{note.title}</h2>
                {note.body ? (
                  <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{note.body}</p>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft">Sans contenu</p>
                )}
                <p className="mt-3 text-xs text-ink-soft/80">{formatDateTime(note.updatedAt || note.createdAt)}</p>
              </button>
              <button type="button" className={`${quietBtn} mt-3 self-start`} onClick={() => handleDelete(note._id)}>
                Retirer
              </button>
            </Surface>
          ))}
        </ul>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8">
          <form
            onSubmit={handleSubmit}
            className="my-auto w-full max-w-lg rounded-[1.6rem] bg-paper p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Note</p>
                <h2 className="font-display text-3xl">{editingId ? 'Modifier' : 'Nouvelle note'}</h2>
              </div>
              <button type="button" onClick={closeForm} className="text-sm text-ink-soft underline">
                Fermer
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <label className="block text-sm font-medium">
                Titre
                <input className={fieldClass} name="title" value={form.title} onChange={update} required />
              </label>
              <label className="block text-sm font-medium">
                Contenu
                <textarea
                  className={`${fieldClass} min-h-36 resize-y`}
                  name="body"
                  value={form.body}
                  onChange={update}
                  placeholder="Ce qu’il faut retenir…"
                />
              </label>
              <label className="block text-sm font-medium">
                Client ou prospect
                <select className={fieldClass} name="contact" value={form.contact} onChange={update}>
                  <option value="">Aucun — note générale</option>
                  {contacts.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                      {item.kind === 'prospect' ? ' · prospect' : item.company ? ` · ${item.company}` : ''}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-normal text-ink-soft">
                  Optionnel. Utile pour rattacher un brief, une idée ou un suivi.
                </span>
              </label>
            </div>
            {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pending} className={primaryBtn}>
                {pending ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter la note'}
              </button>
              <button type="button" onClick={closeForm} className="text-sm underline">
                Annuler
              </button>
              {editingId ? (
                <button
                  type="button"
                  className={`${quietBtn} ml-auto`}
                  onClick={() => handleDelete(editingId)}
                >
                  Retirer
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </PageShell>
  )
}

export default Notes
