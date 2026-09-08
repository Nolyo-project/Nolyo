import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import { fieldClass, formatDateTime } from './format'
import { EmptyState, Modal, PageHeader, PageShell, Surface, icons, ghostBtn, primaryBtn, quietBtn } from './ui'

const empty = { title: '', body: '', contact: '' }

function ExpandableNote({ text }) {
  const ref = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const body = text || 'Sans contenu'

  useEffect(() => {
    setExpanded(false)
  }, [body])

  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return undefined
    function measure() {
      setOverflows(el.scrollHeight > el.clientHeight + 2)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [body, expanded])

  return (
    <div>
      <p
        ref={ref}
        className={`wrap-break-word whitespace-pre-wrap text-sm leading-relaxed text-ink ${expanded ? '' : 'line-clamp-6'}`}
      >
        {body}
      </p>
      {overflows || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-2 text-sm font-semibold text-copper underline decoration-copper/40 underline-offset-4 hover:decoration-copper"
        >
          {expanded ? 'Replier' : 'Voir plus'}
        </button>
      ) : null}
    </div>
  )
}

function contactIdOf(note) {
  return note.contact?._id || note.contact || ''
}

function Notes() {
  const [notes, setNotes] = useState([])
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('all')
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [taskSaved, setTaskSaved] = useState('')

  async function load() {
    const [carnet, data] = await Promise.all([api('/api/workspace/contacts'), api('/api/notes')])
    setContacts(carnet.contacts || [])
    setNotes(data.notes || [])
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
    function refresh() {
      load().catch((err) => setError(err.message))
    }
    window.addEventListener('nolio-workspace-changed', refresh)
    return () => window.removeEventListener('nolio-workspace-changed', refresh)
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return notes.filter((note) => {
      const contactId = contactIdOf(note)
      if (scope === 'linked' && !contactId) return false
      if (scope === 'general' && contactId) return false
      if (!needle) return true
      return [note.title, note.body, note.contact?.name, note.contact?.company]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
    })
  }, [notes, query, scope])

  const groups = useMemo(() => {
    const map = new Map()
    for (const note of filtered) {
      const id = contactIdOf(note) || 'general'
      const label = note.contact?.name || 'Notes générales'
      if (!map.has(id)) map.set(id, { id, label, notes: [] })
      map.get(id).notes.push(note)
    }
    const list = [...map.values()]
    list.sort((a, b) => {
      if (a.id === 'general') return -1
      if (b.id === 'general') return 1
      return a.label.localeCompare(b.label, 'fr')
    })
    return list
  }, [filtered])

  const selected = filtered.find((note) => note._id === selectedId) || filtered[0] || null

  useEffect(() => {
    if (selected && selected._id !== selectedId) setSelectedId(selected._id)
    if (!filtered.length) setSelectedId('')
  }, [filtered, selected, selectedId])

  useEffect(() => {
    setTaskSaved('')
    setError('')
  }, [selectedId])

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function openCreate(contact = '') {
    setEditingId(null)
    setForm({ ...empty, contact })
    setError('')
    setOpen(true)
  }

  function openEdit(note) {
    setEditingId(note._id)
    setSelectedId(note._id)
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
        setSelectedId(data.note._id)
      } else {
        const data = await api('/api/notes', { method: 'POST', body })
        setNotes((current) => [data.note, ...current])
        setSelectedId(data.note._id)
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
    if (selectedId === id) setSelectedId('')
    if (editingId === id) closeForm()
  }

  async function toTask(note) {
    if (!note?._id) return
    setError('')
    setTaskSaved('')
    setPending(true)
    try {
      await api(`/api/notes/${note._id}/task`, { method: 'POST' })
      setTaskSaved('Tâche ajoutée pour aujourd’hui.')
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  const linkedCount = notes.filter((note) => contactIdOf(note)).length
  const generalCount = notes.length - linkedCount

  return (
    <PageShell>
      <PageHeader
        kicker="Notes"
        title="Notes"
        description="Une idée, un brief, un suivi. Classées par personne, faciles à retrouver."
        actions={
          <button type="button" onClick={() => openCreate()} className={primaryBtn}>
            Nouvelle note
          </button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-cream p-1 ring-1 ring-ink/6">
          {[
            { key: 'all', label: 'Toutes', count: notes.length },
            { key: 'linked', label: 'Clients', count: linkedCount },
            { key: 'general', label: 'Générales', count: generalCount },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setScope(item.key)}
              className={`rounded-full px-4 py-2 text-sm ${
                scope === item.key ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
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
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState>
            {query || scope !== 'all'
              ? 'Aucune note ne correspond.'
              : 'Aucune note pour l’instant. Posez la première.'}
            {!query && scope === 'all' ? (
              <button type="button" onClick={() => openCreate()} className={`${primaryBtn} mt-4`}>
                Nouvelle note
              </button>
            ) : null}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid min-w-0 gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
          <Surface className="max-h-[70vh] overflow-y-auto p-3">
            {groups.map((group) => (
              <section key={group.id} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">{group.label}</p>
                  {group.id !== 'general' ? (
                    <button type="button" className={quietBtn} onClick={() => openCreate(group.id)}>
                      Ajouter
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {group.notes.map((note) => (
                    <li key={note._id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(note._id)}
                        className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                          selected?._id === note._id ? 'bg-moss text-cream' : 'hover:bg-paper'
                        }`}
                      >
                        <p className="truncate font-medium">{note.title}</p>
                        <p className={`mt-0.5 truncate text-xs ${selected?._id === note._id ? 'text-cream/70' : 'text-ink-soft'}`}>
                          {formatDateTime(note.updatedAt || note.createdAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </Surface>

          {selected ? (
            <Surface className="flex max-h-[70vh] min-h-0 min-w-0 flex-col overflow-hidden p-6 sm:p-8">
              {selected.contact?.name ? (
                <span className="w-fit rounded-full bg-moss/10 px-2.5 py-1 text-[11px] font-semibold text-moss">
                  {selected.contact.name}
                </span>
              ) : (
                <span className="w-fit rounded-full bg-ink/8 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                  Note générale
                </span>
              )}
              <h2 className="mt-3 shrink-0 wrap-break-word font-display text-3xl tracking-tight">{selected.title}</h2>
              <p className="mt-1 shrink-0 text-xs text-ink-soft">{formatDateTime(selected.updatedAt || selected.createdAt)}</p>
              <div className="mt-6 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
                <ExpandableNote text={selected.body} />
              </div>
              <div className="mt-6 flex shrink-0 flex-wrap gap-3 border-t border-ink/6 pt-5">
                <button type="button" onClick={() => openEdit(selected)} className={primaryBtn}>
                  Modifier
                </button>
                <button type="button" disabled={pending} onClick={() => toTask(selected)} className={ghostBtn}>
                  {pending ? 'Ajout…' : 'Transformer en tâche'}
                </button>
                <button type="button" className={quietBtn} onClick={() => handleDelete(selected._id)}>
                  Retirer
                </button>
              </div>
              {taskSaved ? <p className="mt-3 shrink-0 text-sm text-moss">{taskSaved}</p> : null}
              {error ? <p className="mt-3 shrink-0 text-sm text-red-800">{error}</p> : null}
            </Surface>
          ) : null}
        </div>
      )}

      {open ? (
        <Modal onClose={closeForm} panelClassName="max-w-lg">
          <form onSubmit={handleSubmit}>
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
                  className={`${fieldClass} min-h-36 resize-y wrap-break-word`}
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
                <button type="button" className={`${quietBtn} ml-auto`} onClick={() => handleDelete(editingId)}>
                  Retirer
                </button>
              ) : null}
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  )
}

export default Notes
