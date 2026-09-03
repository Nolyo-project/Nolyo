import { useMemo, useState, useEffect } from 'react'
import { api } from '../../api/client'
import { fieldClass, formatDateTime, formatTime, toDatetimeLocal } from './format'
import { EmptyState, PageHeader, PageShell, Surface, initials, primaryBtn, quietBtn } from './ui'

const empty = { title: '', dueAt: toDatetimeLocal(), channel: 'email', contact: '' }

const channelLabel = {
  email: 'E-mail',
  phone: 'Téléphone',
  other: 'Autre',
}

const channelClass = {
  email: 'bg-moss/10 text-moss',
  phone: 'bg-copper/10 text-copper',
  other: 'bg-paper text-ink-soft',
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M6.5 12.5l3.4 3.4 7.6-8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function dueMeta(dueAt) {
  const due = new Date(dueAt)
  const diffDays = Math.round((startOfDay(due) - startOfDay(new Date())) / 86400000)
  const time = formatTime(due)
  if (diffDays < 0) return { label: `En retard · ${formatDateTime(due)}`, tone: 'late' }
  if (diffDays === 0) return { label: `Aujourd’hui · ${time}`, tone: 'today' }
  if (diffDays === 1) return { label: `Demain · ${time}`, tone: 'soon' }
  return { label: formatDateTime(due), tone: 'later' }
}

function dueTone(dueAt, done) {
  if (done) return 'later'
  return dueMeta(dueAt).tone
}

function Reminders() {
  const [reminders, setReminders] = useState([])
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState(empty)
  const [tab, setTab] = useState('open')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function load() {
    const [relances, carnet] = await Promise.all([
      api('/api/workspace/reminders'),
      api('/api/workspace/contacts'),
    ])
    setReminders(relances.reminders)
    setContacts(carnet.contacts)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const openItems = useMemo(
    () =>
      reminders
        .filter((item) => !item.done)
        .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)),
    [reminders],
  )
  const doneItems = useMemo(
    () =>
      reminders
        .filter((item) => item.done)
        .sort((a, b) => new Date(b.dueAt) - new Date(a.dueAt)),
    [reminders],
  )

  const late = openItems.filter((item) => dueTone(item.dueAt, item.done) === 'late')
  const today = openItems.filter((item) => dueTone(item.dueAt, item.done) === 'today')
  const later = openItems.filter((item) => dueTone(item.dueAt, item.done) !== 'late' && dueTone(item.dueAt, item.done) !== 'today')

  const groups =
    tab === 'done'
      ? [{ key: 'done', title: 'Faites', items: doneItems }]
      : [
          { key: 'late', title: 'En retard', items: late },
          { key: 'today', title: 'Aujourd’hui', items: today },
          { key: 'later', title: 'À venir', items: later },
        ].filter((group) => group.items.length)

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function openCreate() {
    setForm({ ...empty, dueAt: toDatetimeLocal() })
    setError('')
    setOpen(true)
  }

  function closeForm() {
    setOpen(false)
    setForm(empty)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      const data = await api('/api/workspace/reminders', {
        method: 'POST',
        body: { ...form, contact: form.contact || undefined },
      })
      setReminders((current) => [data.reminder, ...current])
      setTab('open')
      closeForm()
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function toggleDone(item) {
    const data = await api(`/api/workspace/reminders/${item._id}`, {
      method: 'PATCH',
      body: { done: !item.done },
    })
    setReminders((current) => current.map((row) => (row._id === item._id ? data.reminder : row)))
    window.dispatchEvent(new Event('nolio-workspace-changed'))
  }

  async function handleDelete(id) {
    await api(`/api/workspace/reminders/${id}`, { method: 'DELETE' })
    setReminders((current) => current.filter((item) => item._id !== id))
    window.dispatchEvent(new Event('nolio-workspace-changed'))
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Suivi"
        title="Relances"
        description="Ce qui attend une action, au bon moment."
        actions={
          <button type="button" onClick={openCreate} className={primaryBtn}>
            Nouvelle relance
          </button>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Surface className={`p-5 ${late.length ? '!bg-moss text-cream !ring-moss' : ''}`}>
          <p
            className={`text-[11px] font-semibold tracking-[0.16em] uppercase ${
              late.length ? 'text-cream/55' : 'text-ink-soft'
            }`}
          >
            En retard
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight">{late.length}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Aujourd’hui</p>
          <p className="mt-2 font-display text-3xl tracking-tight">{today.length}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">À venir</p>
          <p className="mt-2 font-display text-3xl tracking-tight">{later.length}</p>
        </Surface>
      </section>

      <div className="mt-8 flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-cream p-1 ring-1 ring-ink/6">
        <button
          type="button"
          onClick={() => setTab('open')}
          className={`rounded-full px-4 py-2 text-sm ${
            tab === 'open' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
          }`}
        >
          À faire ({openItems.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('done')}
          className={`rounded-full px-4 py-2 text-sm ${
            tab === 'done' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
          }`}
        >
          Faites ({doneItems.length})
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="mt-8">
          <EmptyState>
            {tab === 'done'
              ? 'Aucune relance faite pour l’instant.'
              : 'Aucune relance. Posez la première pour ne rien laisser passer.'}
            {tab === 'open' ? (
              <button type="button" onClick={openCreate} className={`${primaryBtn} mt-4`}>
                Nouvelle relance
              </button>
            ) : null}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              {tab === 'open' ? (
                <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                  {group.title}
                </p>
              ) : null}
              <ul className="space-y-3">
                {group.items.map((item) => {
                  const meta = dueMeta(item.dueAt)
                  const contactName = item.contact?.name
                  return (
                    <Surface as="li" key={item._id} className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => toggleDone(item)}
                          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] transition ${
                            item.done
                              ? 'border-moss bg-moss text-cream'
                              : 'border-ink/18 bg-cream text-transparent hover:border-copper hover:text-copper/40'
                          }`}
                          aria-label={item.done ? 'Remettre à faire' : 'Marquer faite'}
                        >
                          <CheckIcon />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`font-medium ${item.done ? 'text-ink-soft line-through' : ''}`}>
                              {item.title}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                channelClass[item.channel] || channelClass.other
                              }`}
                            >
                              {channelLabel[item.channel] || item.channel}
                            </span>
                          </div>
                          <p
                            className={`mt-1 text-sm ${
                              !item.done && meta.tone === 'late' ? 'font-medium text-copper' : 'text-ink-soft'
                            }`}
                          >
                            {item.done ? formatDateTime(item.dueAt) : meta.label}
                          </p>
                          {contactName ? (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="grid h-7 w-7 place-items-center rounded-full bg-moss text-[10px] font-semibold text-cream">
                                {initials(contactName)}
                              </span>
                              <span className="truncate text-sm text-ink-soft">{contactName}</span>
                            </div>
                          ) : null}
                        </div>
                        <button type="button" className={quietBtn} onClick={() => handleDelete(item._id)}>
                          Retirer
                        </button>
                      </div>
                    </Surface>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8">
          <form
            onSubmit={handleSubmit}
            className="my-auto w-full max-w-lg rounded-[1.6rem] bg-paper p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Suivi</p>
                <h2 className="font-display text-3xl">Nouvelle relance</h2>
              </div>
              <button type="button" onClick={closeForm} className="text-sm text-ink-soft underline">
                Fermer
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <label className="block text-sm font-medium">
                Titre
                <input
                  className={fieldClass}
                  name="title"
                  value={form.title}
                  onChange={update}
                  placeholder="Relancer le devis, rappeler…"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Échéance
                <input
                  className={fieldClass}
                  type="datetime-local"
                  name="dueAt"
                  value={form.dueAt}
                  onChange={update}
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Canal
                  <select className={fieldClass} name="channel" value={form.channel} onChange={update}>
                    <option value="email">E-mail</option>
                    <option value="phone">Téléphone</option>
                    <option value="other">Autre</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Contact
                  <select className={fieldClass} name="contact" value={form.contact} onChange={update}>
                    <option value="">Sans contact</option>
                    {contacts.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                        {item.kind === 'prospect' ? ' · prospect' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pending} className={primaryBtn}>
                {pending ? 'Enregistrement…' : 'Ajouter'}
              </button>
              <button type="button" onClick={closeForm} className="text-sm underline">
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </PageShell>
  )
}

export default Reminders
