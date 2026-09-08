function pad(n) {
  return String(n).padStart(2, '0')
}

function icsUtc(value) {
  const date = new Date(value)
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function icsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function eventRange(startAt, durationMinutes = 60) {
  const start = new Date(startAt)
  const end = new Date(start.getTime() + Math.max(15, Number(durationMinutes) || 60) * 60 * 1000)
  return { start, end }
}

export function buildIcs({ title, startAt, durationMinutes, description, location, uid }) {
  const { start, end } = eventRange(startAt, durationMinutes)
  const eventUid = String(uid || `${start.getTime()}@nolyo.app`).replace(/[^\w.@-]/g, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nolyo//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${eventUid}`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsText(title)}`,
  ]
  if (description) lines.push(`DESCRIPTION:${icsText(description)}`)
  if (location) lines.push(`LOCATION:${icsText(location)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

export function googleCalendarUrl({ title, startAt, durationMinutes, description, location }) {
  const { start, end } = eventRange(startAt, durationMinutes)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Rendez-vous',
    dates: `${icsUtc(start)}/${icsUtc(end)}`,
  })
  if (description) params.set('details', description)
  if (location) params.set('location', location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function downloadIcs(ics, filename = 'rendez-vous.ics') {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const apple =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (apple) {
    window.location.assign(url)
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    return
  }
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
