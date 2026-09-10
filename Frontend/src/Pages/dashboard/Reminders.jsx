import { useMemo, useState, useEffect } from 'react'
import { api } from '../../api/client'
import { fieldClass, formatDateTime, formatTime, toDatetimeLocal } from './format'
import { MailMenu } from './MailMenu'
import { EmptyState, Modal, PageHeader, PageShell, Surface, initials, ghostBtn, primaryBtn, quietBtn } from './ui'

const empty = { title: '', dueAt: toDatetimeLocal(), channel: 'email', contact: '' }

const channelLabel = {
  email: 'E-mail',
  phone: 'Téléphone',
  both: 'E-mail et téléphone',
  other: 'Autre',
}

const channelBorder = {
  email: 'border-l-moss',
  phone: 'border-l-copper',
  both: 'border-l-copper',
  other: 'border-l-ink/20',
}

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function dayHeading(dueAt) {
  const diffDays = Math.round((startOfDay(dueAt) - startOfDay(new Date())) / 86400000)
  const date = new Date(dueAt)
  const label = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const pretty = label.charAt(0).toUpperCase() + label.slice(1)
  if (diffDays < 0) return { key: startOfDay(dueAt), title: pretty, hint: 'En retard', late: true }
  if (diffDays === 0) return { key: startOfDay(dueAt), title: 'Aujourd’hui', hint: pretty, late: false }
  if (diffDays === 1) return { key: startOfDay(dueAt), title: 'Demain', hint: pretty, late: false }
  return { key: startOfDay(dueAt), title: pretty, hint: '', late: false }
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

  const lateCount = openItems.filter((item) => startOfDay(item.dueAt) < startOfDay(new Date())).length
  const todayCount = openItems.filter((item) => startOfDay(item.dueAt) === startOfDay(new Date())).length
  const laterCount = openItems.length - lateCount - todayCount

  const days = useMemo(() => {
    const source = tab === 'done' ? doneItems : openItems
    const map = new Map()
    for (const item of source) {
      const heading = dayHeading(item.dueAt)
      if (!map.has(heading.key)) map.set(heading.key, { ...heading, items: [] })
      map.get(heading.key).items.push(item)
    }
    return [...map.values()]
  }, [doneItems, openItems, tab])

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
        description="Les relances suivent chaque client. Après un devis, elles se posent toutes seules — et vous pouvez relancer par e-mail ou téléphone."
        actions={
          <button type="button" onClick={openCreate} className={primaryBtn}>
            Nouvelle relance
          </button>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Surface className={`p-5 ${lateCount ? '!bg-copper text-cream !ring-copper' : ''}`}>
          <p className={`text-[11px] font-semibold tracking-[0.16em] uppercase ${lateCount ? 'text-cream/70' : 'text-ink-soft'}`}>
            En retard
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight">{lateCount}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Aujourd’hui</p>
          <p className="mt-2 font-display text-3xl tracking-tight">{todayCount}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">À venir</p>
          <p className="mt-2 font-display text-3xl tracking-tight">{laterCount}</p>
        </Surface>
      </section>

      <div className="mt-8 flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-cream p-1 ring-1 ring-ink/6">
        <button
          type="button"
          onClick={() => setTab('open')}
          className={`rounded-full px-4 py-2 text-sm ${tab === 'open' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'}`}
        >
          À relancer ({openItems.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('done')}
          className={`rounded-full px-4 py-2 text-sm ${tab === 'done' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'}`}
        >
          Relancé ({doneItems.length})
        </button>
      </div>

      {days.length === 0 ? (
        <div className="mt-8">
          <EmptyState>
            {tab === 'done'
              ? 'Aucune relance faite pour l’instant.'
              : 'Personne à relancer. Posez un rappel dès qu’un devis ou un appel attend une suite.'}
            {tab === 'open' ? (
              <button type="button" onClick={openCreate} className={`${primaryBtn} mt-4`}>
                Nouvelle relance
              </button>
            ) : null}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {days.map((day) => (
            <section key={day.key}>
              <div className="mb-4 flex flex-wrap items-baseline gap-2">
                <h2 className={`font-display text-2xl tracking-tight ${day.late ? 'text-copper' : ''}`}>{day.title}</h2>
                {day.hint ? <p className="text-sm text-ink-soft">{day.hint}</p> : null}
              </div>
              <ul className="relative space-y-3 border-l border-ink/10 pl-6">
                {day.items.map((item) => {
                  const contactName = item.contact?.name
                  return (
                    <li key={item._id} className="relative">
                      <span
                        className={`absolute top-5 -left-[1.85rem] h-3 w-3 rounded-full ${
                          day.late && !item.done ? 'bg-copper' : 'bg-moss'
                        }`}
                        aria-hidden
                      />
                      <Surface className={`border-l-4 p-5 ${channelBorder[item.channel] || channelBorder.other}`}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
                              {formatTime(item.dueAt)} · {channelLabel[item.channel] || item.channel}
                            </p>
                            <h3 className={`mt-1 font-medium ${item.done ? 'text-ink-soft' : ''}`}>{item.title}</h3>
                            {contactName ? (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-moss text-[10px] font-semibold text-cream">
                                  {initials(contactName)}
                                </span>
                                <span className="truncate text-sm text-ink-soft">{contactName}</span>
                              </div>
                            ) : null}
                            {item.done ? (
                              <p className="mt-2 text-xs text-ink-soft">Relancé · {formatDateTime(item.dueAt)}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {!item.done &&
                            (item.channel === 'email' || item.channel === 'both') &&
                            item.contact?.email ? (
                              <MailMenu
                                email={item.contact.email}
                                name={contactName}
                                subject={item.title}
                                triggerClassName={ghostBtn}
                              >
                                Relancer par e-mail
                              </MailMenu>
                            ) : null}
                            {!item.done &&
                            (item.channel === 'phone' || item.channel === 'both') &&
                            item.contact?.phone ? (
                              <a
                                href={`tel:${String(item.contact.phone).replace(/\s/g, '')}`}
                                className={ghostBtn}
                              >
                                Appeler
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => toggleDone(item)}
                              className={item.done ? quietBtn : primaryBtn}
                            >
                              {item.done ? 'Remettre à relancer' : 'Marquer relancé'}
                            </button>
                            <button type="button" className={quietBtn} onClick={() => handleDelete(item._id)}>
                              Retirer
                            </button>
                          </div>
                        </div>
                      </Surface>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {open ? (
        <Modal onClose={closeForm} panelClassName="max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Suivi</p>
                <h2 className="font-display text-2xl sm:text-3xl">Nouvelle relance</h2>
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
                Quand
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
                    <option value="both">E-mail et téléphone</option>
                    <option value="other">Autre</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Personne
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
        </Modal>
      ) : null}
    </PageShell>
  )
}

export default Reminders
