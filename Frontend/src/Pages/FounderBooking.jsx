import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { buildIcs, downloadIcs, googleCalendarUrl } from '../data/calendarEvent'
import { formatLongDate, formatTime, useMediaMin } from './dashboard/format'
import { Avatar, primaryBtn, quietBtn } from './dashboard/ui'

const emptyGuest = { firstName: '', lastName: '', email: '', phone: '', message: '' }
const fieldClass =
  'mt-1.5 w-full min-w-0 max-w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none transition focus:border-copper focus:ring-2 focus:ring-copper/15'

function FounderBooking() {
  const [host, setHost] = useState(null)
  const [service, setService] = useState(null)
  const [error, setError] = useState('')
  const [days, setDays] = useState([])
  const [date, setDate] = useState('')
  const [dayOffset, setDayOffset] = useState(0)
  const [slot, setSlot] = useState(null)
  const isSm = useMediaMin(640)
  const isLg = useMediaMin(1024)
  const DAY_WINDOW = isLg ? 7 : isSm ? 5 : 3
  const [guest, setGuest] = useState(emptyGuest)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(null)
  const submittingRef = useRef(false)

  const selectedDay = days.find((item) => item.date === date)

  useEffect(() => {
    api('/api/public/founder/booking')
      .then((data) => {
        setHost(data.host)
        const next = data.services?.[0] || null
        setService(next)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!service?._id) {
      setDays([])
      return undefined
    }
    let cancelled = false
    api(`/api/public/founder/availability?service=${encodeURIComponent(service._id)}`)
      .then((data) => {
        if (cancelled) return
        const nextDays = data.days || []
        setDays(nextDays)
        setDayOffset(0)
        setDate((current) => (nextDays.some((item) => item.date === current) ? current : nextDays[0]?.date || ''))
        setSlot(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [service?._id])

  const dayLabels = useMemo(
    () =>
      days.map((item) => {
        const [year, month, day] = item.date.split('-').map(Number)
        const value = new Date(year, month - 1, day)
        return {
          date: item.date,
          weekday: value.toLocaleDateString('fr-FR', { weekday: 'short' }),
          day: value.toLocaleDateString('fr-FR', { day: 'numeric' }),
          month: value.toLocaleDateString('fr-FR', { month: 'short' }),
        }
      }),
    [days],
  )

  const maxDayOffset = Math.max(0, dayLabels.length - DAY_WINDOW)
  const visibleDays = dayLabels.slice(dayOffset, dayOffset + DAY_WINDOW)
  const canShiftLeft = dayOffset > 0
  const canShiftRight = dayOffset < maxDayOffset

  useEffect(() => {
    setDayOffset((current) => Math.min(current, maxDayOffset))
  }, [maxDayOffset])

  function updateGuest(event) {
    setGuest((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!service || !slot || submittingRef.current) return
    submittingRef.current = true
    setError('')
    setPending(true)
    try {
      const data = await api('/api/public/founder/book', {
        method: 'POST',
        body: {
          service: service._id,
          startAt: slot.startAt,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone,
          message: guest.message,
        },
      })
      setDone({ ...data, firstName: guest.firstName.trim() })
    } catch (err) {
      setError(err.message)
    } finally {
      submittingRef.current = false
      setPending(false)
    }
  }

  const appointment = done?.appointment
  const icsPayload = appointment
    ? {
        title: `${appointment.serviceName || 'Rendez-vous'} — Nolyo`,
        startAt: appointment.startAt,
        durationMinutes: appointment.durationMinutes,
        description: 'Échange pour découvrir Nolyo.',
        location: '',
        uid: `founder-${new Date(appointment.startAt).getTime()}@nolyo.fr`,
      }
    : null
  const googleHref = icsPayload ? googleCalendarUrl(icsPayload) : ''

  if (error && !host) {
    return (
      <main className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="font-display text-3xl">Rendez-vous indisponible.</p>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
        <Link to="/" className="mt-6 inline-block text-sm underline">
          Retour à l’accueil
        </Link>
      </main>
    )
  }

  if (!host) {
    return <p className="px-5 py-24 text-center text-ink-soft">Chargement…</p>
  }

  if (done) {
    return (
      <main className="bg-paper">
        <section className="bg-moss px-5 py-16 text-cream sm:px-8">
          <div className="mx-auto max-w-lg text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream text-2xl text-moss">✓</span>
            <p className="mt-6 text-[11px] font-semibold tracking-[0.22em] text-cream/55 uppercase">Rendez-vous confirmé</p>
            <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-5xl">
              Merci{done.firstName ? `, ${done.firstName}` : ''}.
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-cream/75">
              Le créneau est dans l’agenda. On se parle de Nolyo, sans engagement.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-lg px-5 py-12 sm:px-8">
          <div className="rounded-[1.8rem] bg-cream px-6 py-7 ring-1 ring-ink/8 sm:px-8">
            <p className="font-medium">{appointment?.serviceName}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {formatLongDate(appointment?.startAt)} à {formatTime(appointment?.startAt)}
              {appointment?.durationMinutes ? ` · ${appointment.durationMinutes} min` : ''}
            </p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => icsPayload && downloadIcs(buildIcs(icsPayload), 'rendez-vous-nolyo.ics')}
                className={`${primaryBtn} w-full`}
              >
                Ajouter à l’agenda
              </button>
              {googleHref ? (
                <a href={googleHref} target="_blank" rel="noreferrer" className={`${quietBtn} block w-full text-center text-sm`}>
                  Ouvrir dans Google Agenda
                </a>
              ) : null}
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-ink-soft underline">
              Retour à l’accueil
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="bg-paper">
      <section className="bg-moss text-cream">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:py-16">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-cream/50 uppercase">
              Nolyo · {service?.durationMinutes || 30} min
            </p>
            <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-5xl">
              Échanger {host.firstName ? `avec ${host.firstName}` : ''}.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-cream/75">
              Un créneau pour voir si Nolyo vous convient. Sans engagement, directement dans l’agenda.
            </p>
          </div>
          <div className="mx-auto hidden w-fit justify-self-end sm:block lg:mx-0">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-copper/30" />
              <Avatar
                user={{ name: host.name, avatar: host.avatar }}
                light
                className="relative h-40 w-40 text-3xl ring-4 ring-cream/15"
              />
            </div>
            <p className="relative mt-4 text-center text-sm text-cream/70">{host.name}</p>
          </div>
        </div>
      </section>

      <form
        onSubmit={submit}
        className="mx-auto grid max-w-5xl gap-5 px-4 py-8 sm:gap-6 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-12"
      >
        <section className="min-w-0 rounded-[1.8rem] bg-cream px-4 py-6 ring-1 ring-ink/8 sm:px-8 sm:py-7">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">1 · Le créneau</p>
          <h2 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">Date et horaire</h2>
          {days.length === 0 ? (
            <p className="mt-5 text-sm text-ink-soft">Aucun créneau libre sur les prochaines semaines.</p>
          ) : (
            <>
              <div className="mt-6 flex items-stretch gap-1.5 sm:items-center sm:gap-2">
                <button
                  type="button"
                  aria-label="Semaine précédente"
                  disabled={!canShiftLeft}
                  onClick={() => setDayOffset((current) => Math.max(0, current - DAY_WINDOW))}
                  className="grid h-auto min-h-11 w-9 shrink-0 place-items-center rounded-full text-lg ring-1 ring-ink/12 transition enabled:hover:ring-copper disabled:opacity-30 sm:h-11 sm:w-11"
                >
                  ‹
                </button>
                <div className="flex min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {visibleDays.map((item) => {
                    const active = item.date === date
                    return (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => {
                          setDate(item.date)
                          setSlot(null)
                        }}
                        className={`w-[4.4rem] shrink-0 snap-start rounded-2xl px-2 py-3 text-center sm:w-auto sm:min-w-[4.25rem] sm:flex-1 sm:px-3 ${
                          active ? 'bg-moss text-cream' : 'bg-paper ring-1 ring-ink/8'
                        }`}
                      >
                        <span className={`block text-[11px] uppercase ${active ? 'text-cream/70' : 'text-ink-soft'}`}>
                          {item.weekday}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold">{item.day}</span>
                        <span className={`block text-[11px] ${active ? 'text-cream/70' : 'text-ink-soft'}`}>
                          {item.month}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  aria-label="Semaine suivante"
                  disabled={!canShiftRight}
                  onClick={() => setDayOffset((current) => Math.min(maxDayOffset, current + DAY_WINDOW))}
                  className="grid h-auto min-h-11 w-9 shrink-0 place-items-center rounded-full text-lg ring-1 ring-ink/12 transition enabled:hover:ring-copper disabled:opacity-30 sm:h-11 sm:w-11"
                >
                  ›
                </button>
              </div>
              {canShiftRight || canShiftLeft ? (
                <p className="mt-2 text-xs text-ink-soft">Flèches pour voir d’autres dates (jusqu’à ~8 semaines).</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {(selectedDay?.slots || []).map((item) => {
                  const active = slot?.startAt === item.startAt
                  return (
                    <button
                      key={item.startAt}
                      type="button"
                      onClick={() => setSlot(item)}
                      className={`rounded-full px-4 py-2 text-sm ${
                        active ? 'bg-copper text-cream' : 'bg-paper ring-1 ring-ink/10 hover:ring-copper'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
              {selectedDay && (selectedDay.slots || []).length === 0 ? (
                <p className="mt-4 text-sm text-ink-soft">Aucun horaire libre ce jour-là — essayez une autre date.</p>
              ) : null}
            </>
          )}
        </section>

        <section className="min-w-0 rounded-[1.8rem] bg-cream px-4 py-6 ring-1 ring-ink/8 sm:px-8 sm:py-7">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">2 · Vos coordonnées</p>
          <h2 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">Confirmer</h2>
          {slot ? (
            <>
              <p className="mt-2 text-sm text-ink-soft">
                {service?.name} · {formatLongDate(slot.startAt)} à {formatTime(slot.startAt)}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Prénom
                  <input className={fieldClass} name="firstName" value={guest.firstName} onChange={updateGuest} required />
                </label>
                <label className="block text-sm font-medium">
                  Nom
                  <input className={fieldClass} name="lastName" value={guest.lastName} onChange={updateGuest} required />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  E-mail
                  <input className={fieldClass} type="email" name="email" value={guest.email} onChange={updateGuest} required />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Téléphone
                  <input className={fieldClass} name="phone" value={guest.phone} onChange={updateGuest} placeholder="Optionnel" />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Un mot, si vous voulez
                  <textarea
                    className={`${fieldClass} min-h-24 resize-y`}
                    name="message"
                    value={guest.message}
                    onChange={updateGuest}
                    placeholder="Votre activité, ce que vous cherchez…"
                  />
                </label>
              </div>
              {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="submit" disabled={pending} className={primaryBtn}>
                  {pending ? 'Confirmation…' : 'Confirmer le rendez-vous'}
                </button>
                <button type="button" className={quietBtn} onClick={() => setSlot(null)}>
                  Changer d’horaire
                </button>
              </div>
            </>
          ) : (
            <p className="mt-6 rounded-2xl bg-paper px-4 py-8 text-center text-sm text-ink-soft">
              {error && host ? error : 'Choisissez d’abord un jour, puis un horaire.'}
            </p>
          )}
        </section>
      </form>
    </main>
  )
}

export default FounderBooking
