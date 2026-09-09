import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { copyForUser } from '../../data/trades'
import { hasModule } from '../../data/workspace'
import {
  WEEKDAY_LABELS,
  addDays,
  appointmentOverlaps,
  appointmentSlotSpan,
  buildDaySlots,
  defaultSchedule,
  fieldClass,
  formatMoney,
  formatTime,
  isSlotInFuture,
  slotDateTime,
  startOfWeek,
  toDateInput,
  useNow,
} from './format'
import { Modal, PageHeader, PageShell, Surface, ghostBtn, primaryBtn } from './ui'

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

function weekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const start = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: sameMonth ? undefined : 'short' })
  const end = weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${start} – ${end}`
}

function isSlotOrigin(appointment, slotStart, durationMinutes) {
  const start = new Date(appointment.startAt).getTime()
  const slotEnd = slotStart.getTime() + durationMinutes * 60000
  return start >= slotStart.getTime() && start < slotEnd
}

function personName(contact, fallback = '') {
  const full = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ')
  return full || contact?.name || fallback
}

function agendaCardTitle(item) {
  const person = personName(item.contact)
  if (item.serviceName && person) return `${item.serviceName} - ${person}`
  return person || item.title
}

function dayIsAbsent(day, absences) {
  if (!absences?.length) return false
  const ymd = toDateInput(day)
  return absences.some((item) => item.startDate <= ymd && item.endDate >= ymd)
}

function canPlaceAppointment(start, durationMinutes, appointments, excludeId, workDays, now, absences) {
  if (!start || Number.isNaN(start.getTime())) return false
  if (!isSlotInFuture(start, now)) return false
  if (!workDays.includes(start.getDay())) return false
  if (dayIsAbsent(start, absences)) return false
  const end = start.getTime() + durationMinutes * 60000
  return !appointments.some((item) => {
    if (String(item._id) === String(excludeId) || item.status !== 'planned') return false
    const from = new Date(item.startAt).getTime()
    const to = from + (item.durationMinutes || durationMinutes || 60) * 60000
    return from < end && to > start.getTime()
  })
}

function Appointments({ variant = 'member', apiBase, compact = false }) {
  const { user, updateUser } = useAuth()
  const copy =
    variant === 'founder'
      ? {
          appointments: 'Rendez-vous',
          agendaKicker: 'Bureau',
          clients: 'Personnes',
          clientsSingular: 'personne',
          prospects: 'Prospects',
          prospectsSingular: 'prospect',
        }
      : copyForUser(user)
  const fill = compact || variant === 'founder'
  const base = apiBase || (variant === 'founder' ? '/api/president' : '/api/workspace')
  const now = useNow()
  const schedule = user?.schedule || defaultSchedule()
  const [weekStart, setWeekStart] = useState(() => startOfWeek())
  const [appointments, setAppointments] = useState([])
  const [contacts, setContacts] = useState([])
  const [absences, setAbsences] = useState([])
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(schedule)
  const [savingSettings, setSavingSettings] = useState(false)
  const [booking, setBooking] = useState(null)
  const [contactId, setContactId] = useState('')
  const [guest, setGuest] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [pending, setPending] = useState(false)
  const [selected, setSelected] = useState(null)
  const [drag, setDrag] = useState(null)
  const [rdvTab, setRdvTab] = useState('agenda')
  const [outcomes, setOutcomes] = useState({ ended: [], converted: [], counts: {} })
  const [outcomePending, setOutcomePending] = useState('')
  const dragRef = useRef(null)
  const ghostRef = useRef(null)
  const suppressClickRef = useRef(false)
  const isFounder = variant === 'founder'
  const isPro = !isFounder && isProPlan(user)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const slots = useMemo(
    () => buildDaySlots(schedule.workStart, schedule.workEnd, schedule.durationMinutes),
    [schedule],
  )
  const workDays = schedule.workDays || [1, 2, 3, 4, 5]

  const occupancy = useMemo(() => {
    const map = new Map()
    let free = 0
    const takenIds = new Set()
    const visible = drag?.id ? appointments.filter((item) => item._id !== drag.id) : appointments
    days.forEach((day) => {
      const open = workDays.includes(day.getDay())
      const away = dayIsAbsent(day, absences)
      slots.forEach((slot) => {
        const start = slotDateTime(day, slot.startMinutes)
        const key = start.toISOString()
        if (!open) {
          map.set(key, { status: 'closed' })
          return
        }
        const appointment = visible.find((item) =>
          appointmentOverlaps(item, start, schedule.durationMinutes),
        )
        if (appointment) {
          map.set(key, { status: 'busy', appointment })
          if (appointment.status === 'planned' && isSlotInFuture(new Date(appointment.startAt), now)) {
            takenIds.add(String(appointment._id))
          }
          return
        }
        if (away) {
          map.set(key, { status: 'absence' })
          return
        }
        if (!isSlotInFuture(start, now)) {
          map.set(key, { status: 'past' })
        } else {
          map.set(key, { status: 'free' })
          free += 1
        }
      })
    })
    return { map, free, taken: takenIds.size }
  }, [absences, appointments, days, drag?.id, now, schedule.durationMinutes, slots, workDays])

  async function loadWeek(start) {
    const from = start.toISOString()
    const to = addDays(start, 7).toISOString()
    const requests = [
      api(`${base}/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      api(`${base}/contacts`),
    ]
    if (isPro) requests.push(api('/api/workspace/absences').catch(() => ({ absences: [] })))
    const [rdv, carnet, away] = await Promise.all(requests)
    setAppointments(rdv.appointments || [])
    setContacts(carnet.contacts || [])
    if (isPro) {
      const fromYmd = toDateInput(start)
      const toYmd = toDateInput(addDays(start, 6))
      setAbsences(
        (away?.absences || []).filter((item) => item.startDate <= toYmd && item.endDate >= fromYmd),
      )
    } else {
      setAbsences([])
    }
  }

  async function loadOutcomes() {
    if (!isFounder) return
    const data = await api(`${base}/appointment-outcomes`)
    setOutcomes({
      ended: data.ended || [],
      converted: data.converted || [],
      counts: data.counts || {},
    })
  }

  useEffect(() => {
    loadWeek(weekStart).catch((err) => setError(err.message))
    function refresh() {
      if (dragRef.current?.activated) return
      loadWeek(weekStart).catch((err) => setError(err.message))
      if (isFounder) loadOutcomes().catch(() => {})
    }
    window.addEventListener('nolio-workspace-changed', refresh)
    return () => window.removeEventListener('nolio-workspace-changed', refresh)
  }, [weekStart, isPro])

  useEffect(() => {
    if (!isFounder || rdvTab === 'agenda') return
    loadOutcomes().catch((err) => setError(err.message))
  }, [isFounder, rdvTab])

  useEffect(() => {
    if (!drag) return undefined
    const previousCursor = document.body.style.cursor
    const previousSelect = document.body.style.userSelect
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    const d = dragRef.current
    if (d && ghostRef.current) {
      ghostRef.current.style.transform = `translate(${d.lastX - d.offsetX}px, ${d.lastY - d.offsetY}px)`
    }
    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousSelect
    }
  }, [drag])

  useEffect(() => {
    return () => {
      dragRef.current?.cleanup?.()
      dragRef.current = null
    }
  }, [])

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
      const data = await api(`${base}/settings`, {
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
    const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ').trim()
    if (variant === 'founder') {
      if (!contactId && guestName.length < 2) {
        setError('Indiquez qui vient, ou choisissez une personne déjà connue.')
        return
      }
    } else if (!booking || !contactId) {
      setError(`Choisissez un ${copy.clientsSingular} pour ce créneau.`)
      return
    }
    if (!booking) return
    if (dayIsAbsent(booking, absences)) {
      setError('Ce jour est en congés.')
      setBooking(null)
      return
    }
    if (!isSlotInFuture(booking)) {
      setError('Ce créneau est déjà passé.')
      setBooking(null)
      return
    }
    if (pending) return
    const contact = contacts.find((item) => item._id === contactId)
    setPending(true)
    setError('')
    try {
      const data = await api(`${base}/appointments`, {
        method: 'POST',
        body: {
          title: `RDV — ${contact?.name || guestName || 'Échange'}`,
          startAt: booking.toISOString(),
          contact: contactId || undefined,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone,
          durationMinutes: schedule.durationMinutes,
        },
      })
      setAppointments((current) =>
        [...current, data.appointment].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
      )
      setBooking(null)
      setContactId('')
      setGuest({ firstName: '', lastName: '', email: '', phone: '' })
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function cancelAppointment(id) {
    await api(`${base}/appointments/${id}`, { method: 'PATCH', body: { status: 'cancelled' } })
    setAppointments((current) => current.filter((item) => item._id !== id))
    setSelected(null)
    window.dispatchEvent(new Event('nolio-workspace-changed'))
  }

  async function removeAppointment(id) {
    await api(`${base}/appointments/${id}`, { method: 'DELETE' })
    setAppointments((current) => current.filter((item) => item._id !== id))
    setSelected(null)
    window.dispatchEvent(new Event('nolio-workspace-changed'))
  }

  async function setClientOutcome(id, clientOutcome) {
    setOutcomePending(id)
    setError('')
    try {
      await api(`${base}/appointments/${id}`, { method: 'PATCH', body: { clientOutcome } })
      await loadOutcomes()
    } catch (err) {
      setError(err.message)
    } finally {
      setOutcomePending('')
    }
  }

  function hoverFromPoint(clientX, clientY, item) {
    const el = document.elementFromPoint(clientX, clientY)
    const cell = el?.closest?.('[data-agenda-slot]')
    if (!cell) return { iso: null, start: null, valid: false }
    const iso = cell.getAttribute('data-agenda-slot')
    const start = new Date(iso)
    const duration = item.durationMinutes || schedule.durationMinutes
    return {
      iso,
      start,
      valid: canPlaceAppointment(start, duration, appointments, item._id, workDays, now, absences),
    }
  }

  function updateGhost(clientX, clientY) {
    const d = dragRef.current
    if (!d || !ghostRef.current) return
    ghostRef.current.style.transform = `translate(${clientX - d.offsetX}px, ${clientY - d.offsetY}px)`
  }

  function endDrag() {
    dragRef.current = null
    setDrag(null)
  }

  function swallowNextClick() {
    const onClick = (event) => {
      event.preventDefault()
      event.stopPropagation()
      window.removeEventListener('click', onClick, true)
    }
    window.addEventListener('click', onClick, true)
    window.setTimeout(() => window.removeEventListener('click', onClick, true), 400)
  }

  function onCardPointerDown(event, item) {
    if (event.button !== 0) return
    if (item.status !== 'planned') return
    const rect = event.currentTarget.getBoundingClientRect()
    const pointerId = event.pointerId
    dragRef.current = {
      item,
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      activated: false,
    }

    function onMove(moveEvent) {
      if (moveEvent.pointerId !== pointerId) return
      const d = dragRef.current
      if (!d) return
      d.lastX = moveEvent.clientX
      d.lastY = moveEvent.clientY
      const dist = Math.hypot(moveEvent.clientX - d.startX, moveEvent.clientY - d.startY)
      if (!d.activated) {
        if (dist < 8) return
        d.activated = true
        suppressClickRef.current = true
        setSelected(null)
        setBooking(null)
        setDrag({
          id: d.item._id,
          label: d.item.contact?.name || d.item.title,
          hint: d.item.contact?.phone || 'Déplacer vers un créneau libre',
          hoverIso: null,
          valid: false,
        })
      }
      updateGhost(moveEvent.clientX, moveEvent.clientY)
      const hover = hoverFromPoint(moveEvent.clientX, moveEvent.clientY, d.item)
      setDrag((current) => {
        if (!current) return current
        if (current.hoverIso === hover.iso && current.valid === hover.valid) return current
        return { ...current, hoverIso: hover.iso, valid: hover.valid }
      })
    }

    async function onUp(upEvent) {
      if (upEvent.pointerId !== pointerId) return
      cleanup()
      const d = dragRef.current
      if (!d) return
      if (!d.activated) {
        endDrag()
        return
      }
      swallowNextClick()
      const hover = hoverFromPoint(upEvent.clientX, upEvent.clientY, d.item)
      const moved = d.item
      const snapshot = appointments
      endDrag()
      if (!hover.iso) return
      if (!hover.valid || !hover.start) {
        setError('Ce créneau n’est pas disponible.')
        return
      }
      if (new Date(moved.startAt).getTime() === hover.start.getTime()) return
      setError('')
      setAppointments((current) =>
        current.map((entry) => (entry._id === moved._id ? { ...entry, startAt: hover.start.toISOString() } : entry)),
      )
      try {
        const data = await api(`${base}/appointments/${moved._id}`, {
          method: 'PATCH',
          body: { startAt: hover.start.toISOString() },
        })
        setAppointments((current) => current.map((entry) => (entry._id === moved._id ? data.appointment : entry)))
        window.dispatchEvent(new Event('nolio-workspace-changed'))
      } catch (err) {
        setAppointments(snapshot)
        setError(err.message)
      }
    }

    function onCancel(cancelEvent) {
      if (cancelEvent.pointerId !== pointerId) return
      cleanup()
      endDrag()
    }

    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onCancel, true)
    }

    if (dragRef.current) dragRef.current.cleanup = cleanup

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onCancel, true)
  }

  function openAppointment(item) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setSelected(item)
  }

  function dropClass(iso) {
    if (!drag || drag.hoverIso !== iso) return ''
    return drag.valid
      ? 'ring-2 ring-copper ring-offset-2 ring-offset-cream'
      : 'ring-2 ring-red-700/40'
  }

  const weekActions = (
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
      <button type="button" onClick={() => setSettingsOpen(true)} className={primaryBtn}>
        Horaires
      </button>
    </>
  )

  return (
    <PageShell className={fill ? 'flex h-full min-h-0 flex-col overflow-hidden !px-5 !py-4 lg:!px-8 lg:!py-4' : ''}>
      {fill ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">{copy.agendaKicker}</p>
            <h1 className="font-display text-2xl tracking-tight">{copy.appointments}</h1>
          </div>
          {rdvTab === 'agenda' ? <div className="flex flex-wrap items-center gap-2">{weekActions}</div> : null}
        </div>
      ) : (
        <PageHeader
          kicker={copy.agendaKicker}
          title={copy.appointments}
          description={`${occupancy.free} place${occupancy.free > 1 ? 's' : ''} disponible${occupancy.free > 1 ? 's' : ''} cette semaine${occupancy.taken ? ` · ${occupancy.taken} prise${occupancy.taken > 1 ? 's' : ''}` : ''}`}
          actions={weekActions}
        />
      )}

      {isFounder ? (
        <div className="mt-3 flex shrink-0 flex-wrap gap-2">
          {[
            ['agenda', 'Agenda'],
            ['ended', `Terminés · ${outcomes.counts.ended || 0}`],
            ['converted', `Clients · ${outcomes.counts.converted || 0}`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRdvTab(id)}
              className={`rounded-full px-3.5 py-1.5 text-sm ${rdvTab === id ? 'bg-moss text-cream' : 'bg-cream ring-1 ring-ink/8'}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 shrink-0 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      {isFounder && rdvTab !== 'agenda' ? (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {(rdvTab === 'converted' ? outcomes.converted : outcomes.ended).length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/12 bg-cream/40 px-6 py-12 text-center text-sm text-ink-soft">
              {rdvTab === 'converted'
                ? 'Personne n’est encore passé de rendez-vous à client.'
                : 'Aucun rendez-vous terminé pour le moment.'}
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(rdvTab === 'converted' ? outcomes.converted : outcomes.ended).map((item) => (
                <li key={item._id} className="rounded-[1.4rem] bg-cream p-5 ring-1 ring-ink/6">
                  <p className="font-medium">{personName(item.contact, item.title)}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {new Date(item.startAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {formatTime(item.startAt)}
                  </p>
                  {item.contact?.email ? <p className="mt-1 truncate text-xs text-ink-soft">{item.contact.email}</p> : null}
                  <p className={`mt-3 text-sm font-medium ${item.isConverted ? 'text-moss' : 'text-ink-soft'}`}>
                    {item.conversionLabel}
                  </p>
                  {rdvTab === 'ended' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={outcomePending === item._id}
                        onClick={() => setClientOutcome(item._id, 'converted')}
                        className="rounded-full bg-moss px-3.5 py-1.5 text-sm font-semibold text-cream disabled:opacity-60"
                      >
                        Devenu client
                      </button>
                      <button
                        type="button"
                        disabled={outcomePending === item._id}
                        onClick={() => setClientOutcome(item._id, 'not_converted')}
                        className="rounded-full border border-ink/10 px-3.5 py-1.5 text-sm disabled:opacity-60"
                      >
                        Non
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {settingsOpen ? (
        <Modal onClose={() => setSettingsOpen(false)} panelClassName="max-w-xl">
        <form onSubmit={saveSettings}>
          <h2 className="font-display text-2xl">Horaires de travail</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {variant === 'founder'
              ? 'Ces horaires sont ceux que les visiteurs voient sur nolyo.fr/rdv.'
              : 'L’agenda découpe vos journées selon ces horaires et la durée d’un rendez-vous.'}
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
        </form>
        </Modal>
      ) : null}

      {(!isFounder || rdvTab === 'agenda') ? (
        <>
      <Surface className={fill ? 'mt-4 flex min-h-0 flex-1 flex-col overflow-hidden p-3' : 'mt-6 overflow-x-auto p-4'}>
        <div className={fill ? 'min-h-0 min-w-[52rem] flex-1 overflow-auto' : 'min-w-[52rem]'}>
          {slots.length === 0 ? (
            <p className="mt-8 rounded-[1.4rem] border border-dashed border-ink/15 px-5 py-12 text-center text-ink-soft">
              Ajustez vos horaires dans Paramètres pour afficher des créneaux.
            </p>
          ) : (
            <div
              className="mt-3 grid gap-2"
              style={{
                gridTemplateColumns: '4.5rem repeat(7, minmax(0, 1fr))',
                gridTemplateRows: `auto repeat(${slots.length}, minmax(${fill ? '2.55rem' : '3.5rem'}, auto))`,
              }}
            >
              <div className="grid place-items-center text-xs text-ink-soft">Horaire</div>
              {days.map((day) => {
                const open = workDays.includes(day.getDay())
                const away = dayIsAbsent(day, absences)
                const isToday = new Date().toDateString() === day.toDateString()
                return (
                  <div key={`head-${day.toISOString()}`} className="text-center">
                    <p className={`text-xs uppercase ${isToday ? 'font-semibold text-copper' : 'text-ink-soft'}`}>
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                    <p className={`text-sm ${isToday ? 'font-semibold' : ''} ${away ? 'text-ink-soft' : ''}`}>
                      {day.toLocaleDateString('fr-FR', { day: 'numeric' })}
                    </p>
                    {!open ? (
                      <p className="text-[11px] text-ink-soft">Fermé</p>
                    ) : away ? (
                      <p className="text-[11px] font-medium text-ink-soft">Congés</p>
                    ) : null}
                  </div>
                )
              })}

              {slots.map((slot, slotIndex) => (
                <p
                  key={slot.label}
                  className="grid place-items-center text-xs text-ink-soft"
                  style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
                >
                  {slot.label}
                </p>
              ))}

              {days.flatMap((day, dayIndex) =>
                slots.flatMap((slot, slotIndex) => {
                  const start = slotDateTime(day, slot.startMinutes)
                  const iso = start.toISOString()
                  const cell = occupancy.map.get(iso)
                  const style = {
                    gridColumn: dayIndex + 2,
                    gridRow: slotIndex + 2,
                  }

                  if (!cell || cell.status === 'closed') {
                    return [
                      <div key={iso} style={style} className="min-h-14 rounded-xl bg-ink/5" />,
                    ]
                  }

                  if (cell.status === 'absence') {
                    return [
                      <div
                        key={iso}
                        style={style}
                        className="grid min-h-14 place-items-center rounded-xl bg-ink/[0.07] text-[11px] text-ink-soft/80"
                        title="Jour de congés — réservation fermée"
                      >
                        Congés
                      </div>,
                    ]
                  }

                  if (cell.status === 'busy') {
                    const item = cell.appointment
                    if (!isSlotOrigin(item, start, schedule.durationMinutes)) return []
                    const span = appointmentSlotSpan(item, schedule.durationMinutes, slots.length - slotIndex)
                    const past = !isSlotInFuture(start, now)
                    return [
                      <div
                        key={iso}
                        data-agenda-slot={iso}
                        style={{ ...style, gridRow: `${slotIndex + 2} / span ${span}` }}
                        className={`${fill ? 'min-h-11' : 'min-h-16'} ${dropClass(iso)}`.trim()}
                      >
                        <button
                          type="button"
                          draggable={false}
                          onClick={() => openAppointment(item)}
                          onPointerDown={(event) => onCardPointerDown(event, item)}
                          className={`flex h-full ${fill ? 'min-h-11 px-1.5 py-1' : 'min-h-16 px-2 py-2'} w-full touch-none flex-col justify-center rounded-xl text-left select-none ${
                            item.status === 'planned' ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${past ? 'bg-moss/50 text-cream' : 'bg-moss text-cream'}`}
                        >
                          <p className="truncate text-xs font-semibold">{agendaCardTitle(item)}</p>
                          <p className="truncate text-[11px] text-cream/85">
                            {item.contact?.phone || 'Pas de numéro'}
                          </p>
                          {(item.durationMinutes || schedule.durationMinutes) > schedule.durationMinutes ? (
                            <p className="mt-0.5 truncate text-[11px] text-cream/75">
                              {item.durationMinutes || schedule.durationMinutes} min
                            </p>
                          ) : null}
                        </button>
                      </div>,
                    ]
                  }

                  if (cell.status === 'past') {
                    return [
                      <div
                        key={iso}
                        data-agenda-slot={iso}
                        style={style}
                        className={`grid min-h-14 place-items-center rounded-xl bg-ink/5 text-[11px] text-ink-soft ${dropClass(iso)}`}
                      >
                        Passé
                      </div>,
                    ]
                  }

                  return [
                    <button
                      key={iso}
                      type="button"
                      data-agenda-slot={iso}
                      style={style}
                      onClick={() => {
                        if (dragRef.current?.activated) return
                        setSelected(null)
                        setBooking(start)
                        setContactId('')
                        setError('')
                      }}
                      className={`${fill ? 'min-h-11 py-1 text-xs' : 'min-h-16 py-2 text-sm'} rounded-xl border border-dashed border-moss/25 bg-paper px-2 text-left text-moss transition hover:border-moss hover:bg-moss/10 ${dropClass(iso)}`}
                    >
                      Disponible
                    </button>,
                  ]
                }),
              )}
            </div>
          )}
        </div>
      </Surface>
      {fill ? null : (
        <p className="mt-3 text-xs text-ink-soft">
          Attrapez une carte et glissez-la vers un créneau libre pour déplacer le rendez-vous.
        </p>
      )}

      {drag ? (
        <div
          ref={ghostRef}
          className="pointer-events-none fixed top-0 left-0 z-[70] w-44 rounded-xl bg-moss px-2 py-2 text-cream shadow-2xl"
          style={{ transform: 'translate(-999px, -999px)' }}
        >
          <p className="truncate text-xs font-semibold">{drag.label}</p>
          <p className="truncate text-[11px] text-cream/85">{drag.hint}</p>
        </div>
      ) : null}
        </>
      ) : null}

      {booking ? (
        <Modal
          onClose={() => {
            setBooking(null)
            setContactId('')
            setGuest({ firstName: '', lastName: '', email: '', phone: '' })
          }}
          panelClassName="max-w-md"
        >
          <form onSubmit={bookSlot}>
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
              {variant === 'founder'
                ? 'Personne déjà connue'
                : hasModule(user, 'prospects')
                  ? `${copy.clients} ou ${copy.prospects.toLowerCase()}`
                  : copy.clients}
              <select
                className={fieldClass}
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                required={variant !== 'founder'}
              >
                <option value="">{variant === 'founder' ? 'Nouvelle personne' : 'Choisir une personne'}</option>
                {(variant === 'founder'
                  ? contacts
                  : contacts.filter((item) => item.kind !== 'prospect' || hasModule(user, 'prospects'))
                ).map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                    {item.kind === 'prospect' ? ` · ${copy.prospectsSingular}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {variant === 'founder' && !contactId ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Prénom
                  <input
                    className={fieldClass}
                    value={guest.firstName}
                    onChange={(event) => setGuest((current) => ({ ...current, firstName: event.target.value }))}
                    required
                  />
                </label>
                <label className="block text-sm font-medium">
                  Nom
                  <input
                    className={fieldClass}
                    value={guest.lastName}
                    onChange={(event) => setGuest((current) => ({ ...current, lastName: event.target.value }))}
                    required
                  />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  E-mail
                  <input
                    className={fieldClass}
                    type="email"
                    value={guest.email}
                    onChange={(event) => setGuest((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Téléphone
                  <input
                    className={fieldClass}
                    value={guest.phone}
                    onChange={(event) => setGuest((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
              </div>
            ) : null}
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
                  setGuest({ firstName: '', lastName: '', email: '', phone: '' })
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {selected ? (
        <Modal onClose={() => setSelected(null)} panelClassName="max-w-md">
          <div>
            <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">Rendez-vous</p>
            <h2 className="font-display text-3xl">{agendaCardTitle(selected)}</h2>
            {selected.servicePrice ? (
              <p className="mt-1 text-sm text-ink-soft">{formatMoney(selected.servicePrice)} · à encaisser en fin de soin</p>
            ) : null}
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
            {selected.contact?.email ? (
              <a href={`mailto:${selected.contact.email}`} className="mt-1 block text-sm hover:text-copper">
                {selected.contact.email}
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
        </Modal>
      ) : null}
    </PageShell>
  )
}

export default Appointments
