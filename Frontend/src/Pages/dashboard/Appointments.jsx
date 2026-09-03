import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import {
  WEEKDAY_LABELS,
  addDays,
  appointmentOverlaps,
  buildDaySlots,
  defaultSchedule,
  fieldClass,
  formatTime,
  isSlotInFuture,
  slotDateTime,
  startOfWeek,
  useNow,
} from './format'
import { PageHeader, PageShell, Surface, ghostBtn, primaryBtn } from './ui'

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

function weekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const start = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: sameMonth ? undefined : 'short' })
  const end = weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${start} – ${end}`
}

function Appointments() {
  const { user, updateUser } = useAuth()
  const now = useNow()
  const schedule = user?.schedule || defaultSchedule()
  const [weekStart, setWeekStart] = useState(() => startOfWeek())
  const [appointments, setAppointments] = useState([])
  const [contacts, setContacts] = useState([])
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(schedule)
  const [savingSettings, setSavingSettings] = useState(false)
  const [booking, setBooking] = useState(null)
  const [contactId, setContactId] = useState('')
  const [pending, setPending] = useState(false)
  const [selected, setSelected] = useState(null)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const slots = useMemo(
    () => buildDaySlots(schedule.workStart, schedule.workEnd, schedule.durationMinutes),
    [schedule],
  )
  const workDays = schedule.workDays || [1, 2, 3, 4, 5]

  const occupancy = useMemo(() => {
    const map = new Map()
    let free = 0
    let taken = 0
    days.forEach((day) => {
      const open = workDays.includes(day.getDay())
      slots.forEach((slot) => {
        const start = slotDateTime(day, slot.startMinutes)
        const key = start.toISOString()
        if (!open) {
          map.set(key, { status: 'closed' })
          return
        }
        const appointment = appointments.find((item) =>
          appointmentOverlaps(item, start, schedule.durationMinutes),
        )
        if (appointment) {
          map.set(key, { status: 'busy', appointment })
          if (appointment.status === 'planned' && isSlotInFuture(start, now)) taken += 1
        } else if (!isSlotInFuture(start, now)) {
          map.set(key, { status: 'past' })
        } else {
          map.set(key, { status: 'free' })
          free += 1
        }
      })
    })
    return { map, free, taken }
  }, [appointments, days, now, schedule.durationMinutes, slots, workDays])

  async function loadWeek(start) {
    const from = start.toISOString()
    const to = addDays(start, 7).toISOString()
    const [rdv, carnet] = await Promise.all([
      api(`/api/workspace/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      api('/api/workspace/contacts'),
    ])
    setAppointments(rdv.appointments || [])
    setContacts(carnet.contacts || [])
  }

  useEffect(() => {
    loadWeek(weekStart).catch((err) => setError(err.message))
  }, [weekStart])

  useEffect(() => {
    setSettings({
      workStart: schedule.workStart,
      workEnd: schedule.workEnd,
      durationMinutes: schedule.durationMinutes,
      workDays: [...(schedule.workDays || [1, 2, 3, 4, 5])],
    })
  }, [schedule.workStart, schedule.workEnd, schedule.durationMinutes, schedule.workDays])

  function toggleWorkDay(day) {
    setSettings((current) => {
      const has = current.workDays.includes(day)
      return {
        ...current,
        workDays: has ? current.workDays.filter((item) => item !== day) : [...current.workDays, day].sort(),
      }
    })
  }

  async function saveSettings(event) {
    event.preventDefault()
    setError('')
    setSavingSettings(true)
    try {
      const data = await api('/api/workspace/settings', {
        method: 'PATCH',
        body: settings,
      })
      updateUser(data.user)
      setSettingsOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  async function bookSlot(event) {
    event.preventDefault()
    if (!booking || !contactId) {
      setError('Choisissez un client pour ce créneau.')
      return
    }
    if (!isSlotInFuture(booking)) {
      setError('Ce créneau est déjà passé.')
      setBooking(null)
      return
    }
    const contact = contacts.find((item) => item._id === contactId)
    setPending(true)
    setError('')
    try {
      const data = await api('/api/workspace/appointments', {
        method: 'POST',
        body: {
          title: `RDV — ${contact?.name || 'Client'}`,
          startAt: booking.toISOString(),
          contact: contactId,
          durationMinutes: schedule.durationMinutes,
        },
      })
      setAppointments((current) =>
        [...current, data.appointment].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
      )
      setBooking(null)
      setContactId('')
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function cancelAppointment(id) {
    await api(`/api/workspace/appointments/${id}`, { method: 'PATCH', body: { status: 'cancelled' } })
    setAppointments((current) => current.filter((item) => item._id !== id))
    setSelected(null)
    window.dispatchEvent(new Event('nolio-workspace-changed'))
  }

  async function removeAppointment(id) {
    await api(`/api/workspace/appointments/${id}`, { method: 'DELETE' })
    setAppointments((current) => current.filter((item) => item._id !== id))
    setSelected(null)
    window.dispatchEvent(new Event('nolio-workspace-changed'))
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Agenda"
        title="Rendez-vous"
        description={`${occupancy.free} place${occupancy.free > 1 ? 's' : ''} disponible${occupancy.free > 1 ? 's' : ''} cette semaine${occupancy.taken ? ` · ${occupancy.taken} prise${occupancy.taken > 1 ? 's' : ''}` : ''}`}
        actions={
          <>
            <button type="button" onClick={() => setWeekStart((current) => addDays(current, -7))} className={ghostBtn}>
              Semaine précédente
            </button>
            <p className="min-w-36 text-center text-sm font-medium">{weekLabel(weekStart)}</p>
            <button type="button" onClick={() => setWeekStart((current) => addDays(current, 7))} className={ghostBtn}>
              Semaine suivante
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek())}
              className="rounded-full px-3 py-2 text-sm text-ink-soft underline"
            >
              Aujourd’hui
            </button>
            <button type="button" onClick={() => setSettingsOpen((current) => !current)} className={primaryBtn}>
              Paramètres
            </button>
          </>
        }
      />

      {settingsOpen ? (
        <Surface as="form" onSubmit={saveSettings} className="mt-6 p-6">
          <h2 className="font-display text-2xl">Horaires de travail</h2>
          <p className="mt-1 text-sm text-ink-soft">
            L’agenda découpe vos journées selon ces horaires et la durée d’un rendez-vous.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium">
              Début
              <input
                className={fieldClass}
                type="time"
                value={settings.workStart}
                onChange={(event) => setSettings((current) => ({ ...current, workStart: event.target.value }))}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Fin
              <input
                className={fieldClass}
                type="time"
                value={settings.workEnd}
                onChange={(event) => setSettings((current) => ({ ...current, workEnd: event.target.value }))}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Durée d’un RDV
              <select
                className={fieldClass}
                value={settings.durationMinutes}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, durationMinutes: Number(event.target.value) }))
                }
              >
                {DURATION_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium">Jours travaillés</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((day) => {
                const active = settings.workDays.includes(day.key)
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleWorkDay(day.key)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      active ? 'bg-moss text-cream' : 'bg-paper text-ink-soft'
                    }`}
                  >
                    {day.short}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={savingSettings}
              className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
            >
              {savingSettings ? 'Enregistrement…' : 'Enregistrer les horaires'}
            </button>
            <button type="button" className="text-sm underline" onClick={() => setSettingsOpen(false)}>
              Fermer
            </button>
          </div>
        </Surface>
      ) : null}

      {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <Surface className="mt-6 overflow-x-auto p-4">
        <div className="min-w-[52rem]">
          <div className="grid grid-cols-8 gap-2">
            <div className="text-xs text-ink-soft">Horaire</div>
            {days.map((day) => {
              const open = workDays.includes(day.getDay())
              const isToday = new Date().toDateString() === day.toDateString()
              return (
                <div key={day.toISOString()} className="text-center">
                  <p className={`text-xs uppercase ${isToday ? 'font-semibold text-copper' : 'text-ink-soft'}`}>
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </p>
                  <p className={`text-sm ${isToday ? 'font-semibold' : ''}`}>
                    {day.toLocaleDateString('fr-FR', { day: 'numeric' })}
                  </p>
                  {!open ? <p className="text-[11px] text-ink-soft">Fermé</p> : null}
                </div>
              )
            })}
          </div>

          {slots.length === 0 ? (
            <p className="mt-8 rounded-[1.4rem] border border-dashed border-ink/15 px-5 py-12 text-center text-ink-soft">
              Ajustez vos horaires dans Paramètres pour afficher des créneaux.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {slots.map((slot) => (
                <div key={slot.label} className="grid grid-cols-8 gap-2">
                  <p className="grid place-items-center text-xs text-ink-soft">{slot.label}</p>
                  {days.map((day) => {
                    const start = slotDateTime(day, slot.startMinutes)
                    const cell = occupancy.map.get(start.toISOString())
                    if (!cell || cell.status === 'closed') {
                      return <div key={start.toISOString()} className="min-h-14 rounded-xl bg-ink/5" />
                    }
                    if (cell.status === 'busy') {
                      const item = cell.appointment
                      const past = !isSlotInFuture(start, now)
                      return (
                        <button
                          key={start.toISOString()}
                          type="button"
                          onClick={() => setSelected(item)}
                          className={`min-h-16 rounded-xl px-2 py-2 text-left ${
                            past ? 'bg-moss/50 text-cream' : 'bg-moss text-cream'
                          }`}
                        >
                          <p className="truncate text-xs font-semibold">{item.contact?.name || item.title}</p>
                          <p className="truncate text-[11px] text-cream/85">
                            {item.contact?.phone || 'Pas de numéro'}
                          </p>
                        </button>
                      )
                    }
                    if (cell.status === 'past') {
                      return (
                        <div
                          key={start.toISOString()}
                          className="grid min-h-14 place-items-center rounded-xl bg-ink/5 text-[11px] text-ink-soft"
                        >
                          Passé
                        </div>
                      )
                    }
                    return (
                      <button
                        key={start.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelected(null)
                          setBooking(start)
                          setContactId('')
                          setError('')
                        }}
                        className="min-h-16 rounded-xl border border-dashed border-moss/25 bg-paper px-2 py-2 text-left text-sm text-moss transition hover:border-moss hover:bg-moss/10"
                      >
                        Disponible
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </Surface>

      {booking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <form onSubmit={bookSlot} className="w-full max-w-md rounded-[1.6rem] bg-paper p-6 shadow-2xl">
            <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Nouveau rendez-vous</p>
            <h2 className="font-display text-3xl">Réserver ce créneau</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {booking.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}{' '}
              · {formatTime(booking)} · {schedule.durationMinutes} min
            </p>
            <label className="mt-5 block text-sm font-medium">
              Client ou prospect
              <select
                className={fieldClass}
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                required
              >
                <option value="">Choisir une personne</option>
                {contacts.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                    {item.kind === 'prospect' ? ' · prospect' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
              >
                {pending ? 'Réservation…' : 'Confirmer'}
              </button>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => {
                  setBooking(null)
                  setContactId('')
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-[1.6rem] bg-paper p-6 shadow-2xl">
            <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Rendez-vous</p>
            <h2 className="font-display text-3xl">{selected.contact?.name || selected.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {new Date(selected.startAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}{' '}
              · {formatTime(selected.startAt)} · {selected.durationMinutes || schedule.durationMinutes} min
            </p>
            {selected.contact?.phone ? (
              <a
                href={`tel:${selected.contact.phone.replace(/\s/g, '')}`}
                className="mt-3 block font-medium hover:text-copper"
              >
                {selected.contact.phone}
              </a>
            ) : null}
            {selected.location ? <p className="mt-2 text-sm">{selected.location}</p> : null}
            {selected.notes ? <p className="mt-2 text-sm text-ink-soft">{selected.notes}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {selected.status === 'planned' ? (
                <button
                  type="button"
                  onClick={() => cancelAppointment(selected._id)}
                  className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream"
                >
                  Libérer le créneau
                </button>
              ) : null}
              <button
                type="button"
                className="text-sm text-ink-soft underline hover:text-copper"
                onClick={() => removeAppointment(selected._id)}
              >
                Retirer
              </button>
              <button type="button" className="text-sm underline" onClick={() => setSelected(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}

export default Appointments
