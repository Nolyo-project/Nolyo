import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { copyForUser } from '../../data/trades'
import { hasModule } from '../../data/workspace'
import { paymentMethodLabel } from '../../data/payments'
import {
  appointmentOverlaps,
  buildDaySlots,
  defaultSchedule,
  fieldClass,
  formatDateTime,
  formatMoney,
  isSlotInFuture,
  localDateTimeIso,
  unpaidDeposits,
  normalizeDepositPlan,
  parseLocalDate,
  resolveQuoteStatus,
  dealStage,
  slotDateTime,
  splitDepositAmounts,
  toDateInput,
  useNow,
} from './format'
import { DepositTracker } from './DepositPlanEditor'
import { DealFollow, stageTone } from './DealFollow'
import { MailMenu } from './MailMenu'
import { EmptyState, Modal, PageHeader, PageShell, Pagination, Surface, ghostBtn, icons, primaryBtn, quietBtn } from './ui'

const PAGE_SIZE = 9

const empty = {
  firstName: '',
  lastName: '',
  name: '',
  email: '',
  phone: '',
  company: '',
  activity: '',
  price: '',
  depositPlan: [],
  notes: '',
  serviceLines: [],
}

function linesTotal(lines) {
  return Math.round((lines || []).reduce((sum, line) => sum + Number(line.price || 0) * (line.quantity || 1), 0) * 100) / 100
}

function linesActivity(lines) {
  return (lines || [])
    .map((line) => (line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name))
    .filter(Boolean)
    .join(', ')
}

function applyLines(form, serviceLines) {
  return {
    ...form,
    serviceLines,
    price: serviceLines.length ? String(linesTotal(serviceLines)) : form.price,
    activity: linesActivity(serviceLines),
  }
}

const rdvStatus = {
  planned: 'Prévu',
  done: 'Fait',
  cancelled: 'Annulé',
}

function personParts(item) {
  if (item.firstName || item.lastName) {
    return { firstName: item.firstName || '', lastName: item.lastName || '' }
  }
  const parts = String(item.name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }
}

function upperLastName(value) {
  return String(value || '').trim().toLocaleUpperCase('fr-FR')
}

function formattedPersonName(item) {
  const { firstName, lastName } = personParts(item)
  return [String(firstName || '').trim(), upperLastName(lastName)].filter(Boolean).join(' ')
}

function displayName(form, useParts = false) {
  if (useParts) {
    const fromParts = [form.firstName, upperLastName(form.lastName)].filter(Boolean).join(' ').trim()
    return fromParts || formattedPersonName({ name: form.name })
  }
  return formattedPersonName({ name: form.name }) || formattedPersonName(form)
}

function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function depositSummary(item, userPlan) {
  const rows = splitDepositAmounts(item.price, item.depositPlan?.length ? item.depositPlan : userPlan).filter(
    (step) => step.amount > 0,
  )
  if (!rows.length) return null
  const paid = rows.filter((step) => step.paid).length
  return { paid, total: rows.length, first: rows[0] }
}

function Clients({ mode = 'clients' }) {
  const { user } = useAuth()
  const copy = copyForUser(user)
  const quotesOn = hasModule(user, 'quotes')
  const depositsOn = hasModule(user, 'deposits')
  const isProspects = mode === 'prospects'
  const now = useNow()
  const schedule = user?.schedule || defaultSchedule()
  const [contacts, setContacts] = useState([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('fiche')
  const [listTab, setListTab] = useState('open')
  const [jobStatus, setJobStatus] = useState('open')
  const [sheetKind, setSheetKind] = useState('client')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [rdvDate, setRdvDate] = useState('')
  const [rdvTime, setRdvTime] = useState('')
  const [appointments, setAppointments] = useState([])
  const [clientNotes, setClientNotes] = useState([])
  const [reminders, setReminders] = useState([])
  const [rdvPending, setRdvPending] = useState(false)
  const [dayBusy, setDayBusy] = useState([])
  const [saved, setSaved] = useState('')
  const [dealLog, setDealLog] = useState([])
  const [quoteStatus, setQuoteStatus] = useState('none')
  const [quoteSentAt, setQuoteSentAt] = useState('')
  const [quoteSignedAt, setQuoteSignedAt] = useState('')
  const [catalog, setCatalog] = useState([])

  const clients = useMemo(
    () =>
      contacts.filter((item) => {
        if (isProspects) {
          if (listTab === 'archived') return item.kind === 'prospect' && item.jobStatus === 'archived'
          return item.kind === 'prospect' && item.jobStatus !== 'archived'
        }
        if (item.kind === 'prospect') return false
        if (listTab === 'archived') return item.jobStatus === 'archived'
        if (item.jobStatus === 'archived') return false
        const status = item.jobStatus || 'open'
        return listTab === 'done' ? status === 'done' : status !== 'done'
      }),
    [contacts, isProspects, listTab],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = needle
      ? clients.filter((item) =>
          [item.name, item.firstName, item.lastName, item.company, item.activity, item.email, item.phone]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(needle)),
        )
      : clients
    return [...list].sort((a, b) => {
      const nameOf = (item) => {
        const last = String(item.lastName || '').trim()
        const first = String(item.firstName || '').trim()
        if (last || first) return `${last} ${first}`
        return String(item.name || '').trim()
      }
      return nameOf(a).localeCompare(nameOf(b), 'fr', { sensitivity: 'base' })
    })
  }, [clients, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const rdvSlots = useMemo(() => {
    const day = parseLocalDate(rdvDate)
    if (!day) return []
    if (!schedule.workDays.includes(day.getDay())) return []
    return buildDaySlots(schedule.workStart, schedule.workEnd, schedule.durationMinutes)
  }, [rdvDate, schedule])

  const availableRdvSlots = useMemo(() => {
    const day = parseLocalDate(rdvDate)
    if (!day) return []
    return rdvSlots.filter((slot) => {
      const start = slotDateTime(day, slot.startMinutes)
      if (!isSlotInFuture(start, now)) return false
      return !dayBusy.some((item) => appointmentOverlaps(item, start, schedule.durationMinutes))
    })
  }, [dayBusy, now, rdvDate, rdvSlots, schedule.durationMinutes])

  const history = useMemo(() => {
    const items = [
      ...appointments.map((item) => ({
        id: `rdv-${item._id}`,
        kind: item.source === 'booking' ? 'Réservation Nolyo' : 'Rendez-vous',
        title: item.serviceName || item.title,
        meta: [
          formatDateTime(item.startAt),
          item.paymentStatus === 'paid'
            ? ['Payé', paymentMethodLabel(item.paymentMethod), item.servicePrice ? formatMoney(item.servicePrice) : '']
                .filter(Boolean)
                .join(' · ')
            : item.paymentStatus === 'absent'
              ? 'Absent'
              : rdvStatus[item.status] || item.status,
        ]
          .filter(Boolean)
          .join(' · '),
        at: item.startAt,
      })),
      ...clientNotes.map((item) => ({
        id: `note-${item._id}`,
        kind: 'Note',
        title: item.title,
        meta: item.body || formatDateTime(item.updatedAt || item.createdAt),
        at: item.updatedAt || item.createdAt,
      })),
      ...reminders.map((item) => ({
        id: `relance-${item._id}`,
        kind: 'Relance',
        title: item.title,
        meta: `${formatDateTime(item.dueAt)}${item.done ? ' · Faite' : ''}`,
        at: item.dueAt,
      })),
      ...dealLog.map((item, index) => ({
        id: `deal-${item.at || index}-${index}`,
        kind: 'Suivi',
        title: item.title,
        meta: [item.meta, item.at ? formatDateTime(item.at) : ''].filter(Boolean).join(' · '),
        at: item.at || 0,
      })),
    ]
    return items.sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [appointments, clientNotes, dealLog, reminders])

  async function load() {
    const data = await api(`/api/workspace/contacts?kind=${isProspects ? 'prospect' : 'client'}`)
    setContacts(data.contacts)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
    api('/api/workspace/services')
      .then((data) =>
        setCatalog((data.services || []).filter((item) => item.active !== false && item.kind !== 'heading')),
      )
      .catch(() => {})
    function refresh() {
      load().catch((err) => setError(err.message))
    }
    window.addEventListener('nolio-workspace-changed', refresh)
    return () => window.removeEventListener('nolio-workspace-changed', refresh)
  }, [isProspects])

  useEffect(() => {
    setPage(1)
  }, [query, listTab])

  useEffect(() => {
    if (!open || !rdvDate) {
      setDayBusy([])
      return undefined
    }
    const day = parseLocalDate(rdvDate)
    if (!day) return undefined
    const from = new Date(day)
    from.setHours(0, 0, 0, 0)
    const to = new Date(day)
    to.setHours(23, 59, 59, 999)
    let cancelled = false
    api(
      `/api/workspace/appointments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    )
      .then((data) => {
        if (!cancelled) setDayBusy(data.appointments || [])
      })
      .catch(() => {
        if (!cancelled) setDayBusy([])
      })
    return () => {
      cancelled = true
    }
  }, [open, rdvDate, appointments.length])

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function addServiceLine(service) {
    setForm((current) => {
      const lines = [...(current.serviceLines || [])]
      const index = lines.findIndex((line) => String(line.service || '') === String(service._id))
      if (index >= 0) {
        lines[index] = { ...lines[index], quantity: (lines[index].quantity || 1) + 1 }
      } else {
        lines.push({
          service: service._id,
          name: service.name,
          price: service.price,
          quantity: 1,
        })
      }
      return applyLines(current, lines)
    })
  }

  function removeServiceLine(index) {
    setForm((current) => applyLines(current, (current.serviceLines || []).filter((_, i) => i !== index)))
  }

  function fillForm(item) {
    const parts = personParts(item)
    const fullName = String(item.name || '').trim() || [parts.firstName, parts.lastName].filter(Boolean).join(' ')
    setForm({
      firstName: parts.firstName,
      lastName: parts.lastName,
      name: fullName,
      email: item.email || '',
      phone: item.phone || '',
      company: item.company || '',
      activity: item.activity || '',
      price: item.price === 0 || item.price ? String(item.price) : '',
      depositPlan: normalizeDepositPlan(item.depositPlan?.length ? item.depositPlan : user?.depositPlan),
      notes: item.notes || '',
      serviceLines: Array.isArray(item.serviceLines) ? item.serviceLines : [],
    })
    setJobStatus(item.jobStatus || 'open')
    setSheetKind(item.kind || 'client')
    setQuoteStatus(resolveQuoteStatus(item))
    setQuoteSentAt(item.quoteSentAt || '')
    setQuoteSignedAt(item.quoteSignedAt || '')
    setDealLog(item.dealLog || [])
  }

  async function loadSheet(contactId) {
    const data = await api(`/api/workspace/contacts/${contactId}`)
    fillForm(data.contact)
    setAppointments(data.appointments || [])
    setClientNotes(data.notes || [])
    setReminders(data.reminders || [])
    setContacts((current) =>
      current.some((item) => item._id === data.contact._id)
        ? current.map((item) => (item._id === data.contact._id ? data.contact : item))
        : [data.contact, ...current],
    )
    return data.contact
  }

  useEffect(() => {
    function refreshSheet() {
      if (!editingId) return
      loadSheet(editingId).catch(() => {})
    }
    window.addEventListener('nolio-workspace-changed', refreshSheet)
    return () => window.removeEventListener('nolio-workspace-changed', refreshSheet)
  }, [editingId])

  function openCreate() {
    setEditingId(null)
    setForm({ ...empty, depositPlan: normalizeDepositPlan(user?.depositPlan) })
    setAppointments([])
    setClientNotes([])
    setReminders([])
    setDealLog([])
    setQuoteStatus('none')
    setQuoteSentAt('')
    setQuoteSignedAt('')
    setRdvDate('')
    setRdvTime('')
    setTab('fiche')
    setJobStatus('open')
    setSheetKind(isProspects ? 'prospect' : 'client')
    setError('')
    setSaved('')
    setListTab((current) => (current === 'archived' ? 'open' : current))
    setOpen(true)
  }

  async function openSheet(item) {
    setEditingId(item._id)
    fillForm(item)
    setRdvDate('')
    setRdvTime('')
    setTab('fiche')
    setError('')
    setSaved('')
    setOpen(true)
    try {
      await loadSheet(item._id)
    } catch (err) {
      setError(err.message)
    }
  }

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setForm(empty)
    setAppointments([])
    setClientNotes([])
    setReminders([])
    setDealLog([])
    setQuoteStatus('none')
    setQuoteSentAt('')
    setQuoteSignedAt('')
    setRdvDate('')
    setRdvTime('')
    setTab('fiche')
    setJobStatus('open')
    setSheetKind('client')
    setError('')
    setSaved('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaved('')
    const isProspectForm = isProspects || sheetKind === 'prospect'
    const fullName = displayName(form, isProspectForm)
    if (fullName.length < 2) {
      setError('Indiquez un nom.')
      setTab('fiche')
      return
    }
    const price = form.price === '' ? 0 : Number(form.price)
    if (!isProspectForm && !Number.isFinite(price)) {
      setError('Prix invalide.')
      setTab('fiche')
      return
    }
    setPending(true)
    const body = {
      name: fullName,
      email: form.email,
      phone: form.phone,
      company: form.company,
      notes: form.notes,
      kind: editingId ? sheetKind : isProspects ? 'prospect' : 'client',
    }
    if (isProspectForm) {
      body.firstName = form.firstName
      body.lastName = upperLastName(form.lastName)
      body.activity = form.activity
    } else {
      body.price = price
      body.depositPlan = normalizeDepositPlan(form.depositPlan)
      body.serviceLines = form.serviceLines || []
      body.activity = form.activity || ''
    }
    try {
      if (editingId) {
        const data = await api(`/api/workspace/contacts/${editingId}`, {
          method: 'PATCH',
          body,
        })
        setContacts((current) =>
          current.map((item) => (item._id === editingId ? data.contact : item)),
        )
        fillForm(data.contact)
        setSaved('Fiche enregistrée.')
      } else {
        const data = await api('/api/workspace/contacts', { method: 'POST', body })
        setContacts((current) => [data.contact, ...current])
        setEditingId(data.contact._id)
        fillForm(data.contact)
        setPage(1)
        if (rdvDate && rdvTime) {
          const created = await api('/api/workspace/appointments', {
            method: 'POST',
            body: {
              title: `RDV — ${fullName}`,
              startAt: localDateTimeIso(rdvDate, rdvTime),
              contact: data.contact._id,
              durationMinutes: schedule.durationMinutes,
            },
          })
          setAppointments([created.appointment])
          setRdvDate('')
          setRdvTime('')
        }
        setSaved(isProspectForm ? 'Prospect créé.' : 'Client créé.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function setQuote(status) {
    if (!editingId) return
    setError('')
    setSaved('')
    setPending(true)
    try {
      const data = await api(`/api/workspace/contacts/${editingId}/quote`, {
        method: 'PATCH',
        body: { status },
      })
      setContacts((current) =>
        current.map((item) => (item._id === editingId ? data.contact : item)),
      )
      fillForm(data.contact)
      setSaved(
        status === 'sent' ? 'Devis marqué comme envoyé.' : status === 'signed' ? 'Devis signé.' : 'Devis réinitialisé.',
      )
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function markQuoteFromList(item) {
    if (item.kind === 'prospect' || item.jobStatus === 'done' || item.jobStatus === 'archived') return
    if (resolveQuoteStatus(item) !== 'none') return
    try {
      const data = await api(`/api/workspace/contacts/${item._id}/quote`, {
        method: 'PATCH',
        body: { status: 'sent' },
      })
      setContacts((current) => current.map((row) => (row._id === item._id ? data.contact : row)))
      if (editingId === item._id) fillForm(data.contact)
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    await api(`/api/workspace/contacts/${id}`, { method: 'DELETE' })
    setContacts((current) => current.filter((item) => item._id !== id))
    if (editingId === id) closeForm()
  }

  async function addAppointment() {
    setError('')
    if (!rdvDate || !rdvTime) {
      setError('Indiquez la date et l’heure du rendez-vous.')
      return
    }
    if (!editingId) {
      setError('Enregistrez d’abord la fiche, puis ajoutez le rendez-vous.')
      return
    }
    setRdvPending(true)
    try {
      const created = await api('/api/workspace/appointments', {
        method: 'POST',
        body: {
          title: `RDV — ${displayName(form, isProspects || sheetKind === 'prospect')}`,
          startAt: localDateTimeIso(rdvDate, rdvTime),
          contact: editingId,
          durationMinutes: schedule.durationMinutes,
        },
      })
      setAppointments((current) =>
        [created.appointment, ...current].sort((a, b) => new Date(b.startAt) - new Date(a.startAt)),
      )
      setRdvDate('')
      setRdvTime('')
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setRdvPending(false)
    }
  }

  async function toggleDepositPaid(index, paid) {
    if (!editingId) {
      setError('Enregistrez d’abord la fiche, puis marquez les paiements.')
      return
    }
    setError('')
    setSaved('')
    setPending(true)
    try {
      const data = await api(`/api/workspace/contacts/${editingId}/deposits/${index}`, {
        method: 'PATCH',
        body: {
          paid,
          depositPlan: normalizeDepositPlan(form.depositPlan),
          price: form.price === '' ? 0 : Number(form.price),
        },
      })
      setContacts((current) =>
        current.map((item) => (item._id === editingId ? data.contact : item)),
      )
      fillForm(data.contact)
      setSaved(paid ? 'Paiement enregistré dans Finances.' : 'Paiement annulé.')
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function markDone() {
    if (!editingId) return
    const remaining = unpaidDeposits(form.price, form.depositPlan)
    const quote = resolveQuoteStatus({ quoteStatus, depositPlan: form.depositPlan })
    if (quotesOn && Number(form.price) > 0 && quote !== 'signed') {
      setError('Le devis doit être signé avant de terminer la mission.')
      setTab('fiche')
      return
    }
    if (depositsOn && remaining.length) {
      setError(
        `Encore à encaisser : ${remaining.map((step) => step.label).join(', ')}. Marquez chaque échéance comme payée, puis terminez.`,
      )
      setTab('fiche')
      return
    }
    setError('')
    setPending(true)
    try {
      await api(`/api/workspace/contacts/${editingId}`, {
        method: 'PATCH',
        body: {
          name: displayName(form),
          email: form.email,
          phone: form.phone,
          company: form.company,
          notes: form.notes,
          kind: 'client',
          price: form.price === '' ? 0 : Number(form.price),
          depositPlan: normalizeDepositPlan(form.depositPlan),
        },
      })
      const data = await api(`/api/workspace/contacts/${editingId}/complete`, { method: 'POST' })
      setContacts((current) =>
        current.map((item) => (item._id === editingId ? data.contact : item)),
      )
      fillForm(data.contact)
      setJobStatus('done')
      setListTab('done')
      setSaved('Mission terminée.')
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function convertToClient() {
    if (!editingId) return
    setError('')
    setPending(true)
    const convertedId = editingId
    try {
      await api(`/api/workspace/contacts/${convertedId}`, {
        method: 'PATCH',
        body: {
          name: displayName(form),
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          company: form.company,
          activity: form.activity,
          notes: form.notes,
          kind: 'client',
        },
      })
      setContacts((current) => current.filter((item) => item._id !== convertedId))
      closeForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function reopenJob() {
    if (!editingId) return
    setError('')
    setPending(true)
    try {
      const data = await api(`/api/workspace/contacts/${editingId}/reopen`, { method: 'POST' })
      setContacts((current) =>
        current.map((item) => (item._id === editingId ? data.contact : item)),
      )
      fillForm(data.contact)
      setListTab('open')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function removeAppointment(id) {
    await api(`/api/workspace/appointments/${id}`, { method: 'DELETE' })
    setAppointments((current) => current.filter((item) => item._id !== id))
  }

  const openCount = contacts.filter(
    (item) => (item.jobStatus || 'open') !== 'done' && item.jobStatus !== 'archived',
  ).length
  const doneCount = contacts.filter((item) => item.jobStatus === 'done').length
  const archivedCount = contacts.filter((item) => item.jobStatus === 'archived').length
  const isProspectSheet = isProspects || sheetKind === 'prospect'
  const remainingDeposits = !depositsOn || isProspectSheet ? [] : unpaidDeposits(form.price, form.depositPlan)
  const quoteReady =
    !quotesOn ||
    isProspectSheet ||
    Number(form.price) <= 0 ||
    resolveQuoteStatus({ quoteStatus, depositPlan: form.depositPlan }) === 'signed'
  const depositsUnlocked = !isProspectSheet && quoteReady && jobStatus === 'open'
  const canFinish = remainingDeposits.length === 0 && quoteReady
  const emptyMessage = query
    ? 'Aucun résultat pour cette recherche.'
    : listTab === 'archived'
      ? isProspects
        ? 'Aucune archive pour l’instant.'
        : 'Aucune archive. Les rendez-vous sans suite arriveront ici.'
      : listTab === 'done' && !isProspects
        ? 'Aucune mission terminée pour l’instant.'
        : isProspects
          ? `Pas encore de ${copy.prospects.toLowerCase()}. Ajoutez les personnes à démarcher.`
          : `Aucun ${copy.clientsSingular} en cours pour l’instant.`

  return (
    <PageShell>
      <PageHeader
        kicker={isProspects ? copy.prospects : copy.clients}
        title={isProspects ? copy.prospects : copy.clients}
        description={isProspects ? copy.prospectsHint : copy.clientsHint}
        actions={
          <>
            <label className="relative min-w-0 flex-1 lg:w-72">
              <span className="sr-only">{isProspects ? copy.searchProspect : copy.searchClient}</span>
              <input
                className="w-full rounded-full border border-ink/10 bg-cream py-2.5 pr-4 pl-10 text-sm outline-none ring-1 ring-ink/5 transition focus:border-copper focus:ring-copper/20"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isProspects ? copy.searchProspect : copy.searchClient}
              />
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft">
                {icons.search}
              </span>
            </label>
            <button
              type="button"
              onClick={() => setListTab((current) => (current === 'archived' ? 'open' : 'archived'))}
              className={listTab === 'archived' ? primaryBtn : ghostBtn}
            >
              Archives ({archivedCount})
            </button>
            <button type="button" onClick={openCreate} className={primaryBtn}>
              {isProspects ? copy.newProspect : copy.newClient}
            </button>
          </>
        }
      />

      {isProspects ? null : (
        <div className="mt-6 flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-cream p-1 ring-1 ring-ink/6">
          <button
            type="button"
            onClick={() => setListTab('open')}
            className={`rounded-full px-4 py-2 text-sm ${
              listTab === 'open' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
            }`}
          >
            En cours ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setListTab('done')}
            className={`rounded-full px-4 py-2 text-sm ${
              listTab === 'done' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
            }`}
          >
            Terminé ({doneCount})
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState>{emptyMessage}</EmptyState>
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => {
              const summary = isProspects || !depositsOn ? null : depositSummary(item, user?.depositPlan)
              const stage = isProspects || !quotesOn ? null : dealStage(item, user?.depositPlan)
              return (
              <Surface
                as="li"
                key={item._id}
                className="relative flex cursor-pointer flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <button type="button" className="flex flex-1 flex-col text-left" onClick={() => openSheet(item)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-moss text-sm font-semibold text-cream">
                      {initials(formattedPersonName(item))}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-medium">{formattedPersonName(item)}</h2>
                      <p className="truncate text-sm text-ink-soft">
                        {item.company || item.email || (isProspects ? 'Sans société' : 'Sans coordonnées')}
                      </p>
                      {item.activity ? (
                        <p className="truncate text-sm text-ink-soft">{item.activity}</p>
                      ) : null}
                    </div>
                  </div>
                  {isProspects ? null : (
                    <span className="shrink-0 text-right">
                      <span className="block rounded-full bg-moss/10 px-2.5 py-1 text-[11px] font-semibold text-moss">
                        {formatMoney(item.price || 0)}
                      </span>
                      {summary ? (
                        <span className="mt-1 block text-[11px] text-ink-soft">
                          {summary.paid > 0
                            ? `${summary.paid}/${summary.total} payé`
                            : `${summary.first.label} ${formatMoney(summary.first.amount)}`}
                        </span>
                      ) : null}
                    </span>
                  )}
                  </div>
                  {stage ? (
                    <span className={`mt-3 w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageTone(stage.key)}`}>
                      {stage.label}
                    </span>
                  ) : item.jobStatus === 'archived' ? (
                    <p className="mt-2 text-[11px] font-semibold tracking-wide text-copper uppercase">Sans suite</p>
                  ) : item.kind === 'prospect' ? (
                    <p className="mt-2 text-[11px] font-semibold tracking-wide text-copper uppercase">Prospect</p>
                  ) : null}
                </button>
                <p className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                  {item.email ? (
                    <MailMenu email={item.email} name={formattedPersonName(item)} onPicked={quotesOn ? () => markQuoteFromList(item) : undefined}>
                      {item.email}
                    </MailMenu>
                  ) : null}
                  {item.phone ? <span>{item.phone}</span> : null}
                  {!item.email && !item.phone ? <span>Pas de coordonnées</span> : null}
                </p>
                <div className="mt-auto flex gap-4 pt-4 text-xs font-medium">
                  <button type="button" className="text-ink-soft hover:text-ink" onClick={() => openSheet(item)}>
                    Ouvrir
                  </button>
                  <button
                    type="button"
                    className="text-ink-soft hover:text-copper"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDelete(item._id)
                    }}
                  >
                    Retirer
                  </button>
                </div>
              </Surface>
              )
            })}
          </ul>

          <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
        </>
      )}

      {open ? (
        <Modal onClose={closeForm} panelClassName="max-w-5xl p-5 sm:p-10 lg:p-12">
          <form noValidate onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {editingId ? (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-moss text-sm font-semibold text-cream">
                    {initials(displayName(form, isProspectSheet))}
                  </span>
                ) : null}
                <div className="min-w-0">
                  <p className="text-xs tracking-[0.18em] text-ink-soft uppercase">
                    {isProspectSheet ? 'Fiche prospect' : 'Fiche client'}
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl">
                    {editingId
                      ? displayName(form, isProspectSheet) || (isProspectSheet ? 'Prospect' : 'Client')
                      : isProspectSheet
                        ? 'Nouveau prospect'
                        : 'Nouveau client'}
                  </h2>
                  {editingId ? (
                    <p className="mt-1 truncate text-sm text-ink-soft">
                      {form.company || 'Sans société'}
                      {isProspectSheet && form.activity ? ` · ${form.activity}` : ''}
                      {!isProspectSheet && form.price !== '' ? ` · ${formatMoney(Number(form.price) || 0)}` : ''}
                      {isProspectSheet
                        ? ' · Prospect'
                        : jobStatus === 'archived'
                          ? ' · Sans suite'
                          : jobStatus === 'done'
                            ? ' · Terminé'
                            : ''}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-ink-soft">
                      {isProspectSheet
                        ? 'Gardez le fil du démarchage. Passez-le en client quand c’est bon.'
                        : 'Les informations resteront sur cette fiche.'}
                    </p>
                  )}
                </div>
              </div>
              <button type="button" onClick={closeForm} className="text-sm text-ink-soft underline">
                Fermer
              </button>
            </div>

            {editingId ? (
              <div className="mt-6 flex gap-1 rounded-full bg-cream p-1">
                <button
                  type="button"
                  onClick={() => setTab('fiche')}
                  className={`flex-1 rounded-full px-4 py-2 text-sm ${
                    tab === 'fiche' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
                  }`}
                >
                  Fiche
                </button>
                <button
                  type="button"
                  onClick={() => setTab('historique')}
                  className={`flex-1 rounded-full px-4 py-2 text-sm ${
                    tab === 'historique' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
                  }`}
                >
                  Historique
                  {history.length ? ` (${history.length})` : ''}
                </button>
              </div>
            ) : null}

            {tab === 'fiche' || !editingId ? (
              <>
              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <div className="space-y-5">
                  {isProspectSheet ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium">
                        Prénom
                        <input
                          className={fieldClass}
                          name="firstName"
                          value={form.firstName}
                          onChange={update}
                          required
                        />
                      </label>
                      <label className="block text-sm font-medium">
                        Nom
                        <input
                          className={`${fieldClass} uppercase`}
                          name="lastName"
                          value={form.lastName}
                          onChange={update}
                          required
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="block text-sm font-medium">
                      Nom
                      <input className={fieldClass} name="name" value={form.name} onChange={update} required />
                    </label>
                  )}
                  <label className="block text-sm font-medium">
                    Société
                    <input className={fieldClass} name="company" value={form.company} onChange={update} />
                  </label>
                  {isProspectSheet ? (
                    <label className="block text-sm font-medium">
                      Activité
                      <input
                        className={fieldClass}
                        name="activity"
                        value={form.activity}
                        onChange={update}
                        placeholder="Ce qu’ils font — architecte, photographe…"
                      />
                    </label>
                  ) : null}
                  {isProspectSheet ? null : (
                    <>
                      <div>
                        <p className="text-sm font-medium">Prestations</p>
                        <p className="mt-1 text-xs text-ink-soft">
                          Cliquez pour les ajouter au dossier. Le total sert de base au devis, à faire ensuite sur votre
                          plateforme de facturation.
                        </p>
                        {catalog.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {catalog.map((item) => (
                              <button
                                key={item._id}
                                type="button"
                                onClick={() => addServiceLine(item)}
                                className="rounded-full bg-paper px-3 py-1.5 text-sm ring-1 ring-ink/8 transition hover:bg-moss hover:text-cream hover:ring-moss"
                              >
                                {item.name}
                                <span className="ml-1.5 text-xs opacity-70">{formatMoney(item.price)}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-ink-soft">
                            Aucune prestation pour l’instant.{' '}
                            <Link to="/dashboard/parametres" className="font-medium text-ink underline">
                              Les renseigner
                            </Link>
                          </p>
                        )}
                        {(form.serviceLines || []).length ? (
                          <ul className="mt-3 divide-y divide-ink/8 rounded-2xl bg-paper px-4">
                            {form.serviceLines.map((line, index) => (
                              <li key={`${line.service || line.name}-${index}`} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <span className="min-w-0 truncate text-sm">
                                  {line.name}
                                  {line.quantity > 1 ? ` ×${line.quantity}` : ''}
                                </span>
                                <span className="flex shrink-0 items-center gap-3">
                                  <span className="text-sm font-medium">
                                    {formatMoney(Number(line.price) * (line.quantity || 1))}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-xs text-ink-soft underline hover:text-copper"
                                    onClick={() => removeServiceLine(index)}
                                  >
                                    Retirer
                                  </button>
                                </span>
                              </li>
                            ))}
                            <li className="flex items-center justify-between py-2.5 font-medium">
                              <span>Total</span>
                              <span className="font-display text-lg">{formatMoney(Number(form.price) || 0)}</span>
                            </li>
                          </ul>
                        ) : null}
                      </div>
                      <label className="block text-sm font-medium">
                        Prix de la mission (€)
                        <input
                          className={fieldClass}
                          type="number"
                          min="0"
                          step="0.01"
                          name="price"
                          value={form.price}
                          onChange={update}
                          placeholder="0"
                        />
                      </label>
                      {editingId && quotesOn ? (
                        <DealFollow
                          contact={{
                            quoteStatus,
                            quoteSentAt,
                            quoteSignedAt,
                            depositPlan: form.depositPlan,
                          }}
                          email={form.email}
                          name={displayName(form)}
                          canEdit={jobStatus === 'open' && !pending}
                          pending={pending}
                          onQuote={setQuote}
                        />
                      ) : null}
                      {depositsOn ? (
                      <DepositTracker
                        plan={normalizeDepositPlan(form.depositPlan)}
                        price={form.price}
                        canToggle={Boolean(editingId) && depositsUnlocked && !pending}
                        lockHint={
                          editingId && jobStatus === 'open' && !depositsUnlocked && quotesOn
                            ? 'Faites d’abord signer le devis, puis encaissez.'
                            : ''
                        }
                        onTogglePaid={toggleDepositPaid}
                      />
                      ) : null}
                    </>
                  )}
                  <label className="block text-sm font-medium">
                    E-mail
                    <input className={fieldClass} type="text" inputMode="email" autoComplete="email" name="email" value={form.email} onChange={update} />
                  </label>
                  <label className="block text-sm font-medium">
                    Téléphone
                    <input className={fieldClass} name="phone" value={form.phone} onChange={update} />
                  </label>
                  {isProspectSheet ? null : (
                    <label className="block text-sm font-medium">
                      Mémo
                      <textarea
                        className={`${fieldClass} min-h-24 resize-y`}
                        name="notes"
                        value={form.notes}
                        onChange={update}
                        placeholder="Infos utiles sur ce client"
                      />
                    </label>
                  )}
                </div>

                <div className="rounded-[1.6rem] bg-cream p-6 sm:p-8">
                  <p className="font-display text-2xl">Rendez-vous</p>
                  {appointments.length ? (
                    <ul className="mt-3 space-y-2">
                      {appointments.map((item) => (
                        <li key={item._id} className="flex items-start justify-between gap-3 rounded-xl bg-paper px-3 py-2 text-sm">
                          <span>
                            {formatDateTime(item.startAt)}
                            <span className="mt-0.5 block text-xs text-ink-soft">
                              {item.serviceName || item.title}
                              {item.source === 'booking' ? ' · via Nolyo' : ''}
                              {' · '}
                              {rdvStatus[item.status] || item.status}
                            </span>
                          </span>
                          {item.status !== 'cancelled' ? (
                            <button
                              type="button"
                              className={quietBtn}
                              onClick={() => removeAppointment(item._id)}
                            >
                              Retirer
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-ink-soft">
                      {isProspectSheet ? 'Aucun rendez-vous pour ce prospect.' : 'Aucun rendez-vous pour ce client.'}
                    </p>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Date
                      <input
                        className={fieldClass}
                        type="date"
                        min={toDateInput()}
                        value={rdvDate}
                        onChange={(event) => {
                          setRdvDate(event.target.value)
                          setRdvTime('')
                        }}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Horaire
                      <select
                        className={fieldClass}
                        value={rdvTime}
                        onChange={(event) => setRdvTime(event.target.value)}
                        disabled={!rdvDate}
                      >
                        <option value="">
                          {!rdvDate
                            ? 'Choisissez une date'
                            : availableRdvSlots.length
                              ? 'Choisir un horaire'
                              : parseLocalDate(rdvDate)?.toDateString() === new Date().toDateString()
                                ? 'Plus d’horaire aujourd’hui'
                                : 'Aucun créneau ce jour'}
                        </option>
                        {availableRdvSlots.map((slot) => (
                          <option key={slot.label} value={slot.label}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={addAppointment}
                      disabled={rdvPending}
                      className={`${primaryBtn} mt-4`}
                    >
                      {rdvPending ? 'Ajout…' : 'Ajouter un rendez-vous'}
                    </button>
                  ) : (
                    <p className="mt-3 text-xs text-ink-soft">
                      {isProspectSheet
                        ? 'Enregistrez le prospect pour poser un rendez-vous sur sa fiche.'
                        : 'Enregistrez le client pour poser un rendez-vous sur sa fiche.'}
                    </p>
                  )}
                </div>
              </div>
              </>
            ) : (
              <div className="mt-6">
                {history.length === 0 ? (
                  <EmptyState>
                    {isProspectSheet
                      ? 'Rien pour l’instant. Les rendez-vous, notes et relances liés à ce prospect apparaîtront ici.'
                      : 'Rien pour l’instant. Les devis, paiements, rendez-vous, notes et relances apparaîtront ici.'}
                  </EmptyState>
                ) : (
                  <ul className="space-y-3">
                    {history.map((item) => (
                      <li key={item.id} className="rounded-2xl bg-cream px-4 py-3">
                        <p className="text-[11px] font-semibold tracking-wide text-copper uppercase">{item.kind}</p>
                        <p className="mt-1 font-medium">{item.title}</p>
                        <p className="text-sm text-ink-soft">{item.meta}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {error ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            {saved ? <p className="mt-6 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">{saved}</p> : null}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pending} className={primaryBtn}>
                {pending
                  ? 'Enregistrement…'
                  : editingId
                    ? 'Enregistrer la fiche'
                    : isProspectSheet
                      ? 'Créer le prospect'
                      : 'Créer le client'}
              </button>
              {editingId && isProspectSheet && jobStatus !== 'archived' ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={convertToClient}
                  className="inline-flex items-center justify-center rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-copper-dark disabled:opacity-60"
                >
                  Passer en client
                </button>
              ) : null}
              {editingId && !isProspectSheet && jobStatus !== 'done' && jobStatus !== 'archived' ? (
                <>
                  <button
                    type="button"
                    disabled={pending || !canFinish}
                    onClick={markDone}
                    title={
                      canFinish
                        ? undefined
                        : !quoteReady
                          ? 'Le devis doit être signé avant de terminer.'
                          : `Encore à encaisser : ${remainingDeposits.map((step) => step.label).join(', ')}`
                    }
                    className="inline-flex items-center justify-center rounded-full bg-copper px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-copper-dark disabled:opacity-60"
                  >
                    Terminer
                  </button>
                  {!quoteReady ? (
                    <p className="basis-full text-sm text-ink-soft">
                      Envoyez le devis, faites-le signer, puis encaissez.
                    </p>
                  ) : remainingDeposits.length ? (
                    <p className="basis-full text-sm text-ink-soft">
                      Encore à encaisser : {remainingDeposits.map((step) => step.label).join(', ')}.
                    </p>
                  ) : null}
                </>
              ) : null}
              {editingId && (jobStatus === 'done' || jobStatus === 'archived') ? (
                <button type="button" disabled={pending} onClick={reopenJob} className="text-sm underline">
                  Remettre en cours
                </button>
              ) : null}
              <button type="button" onClick={closeForm} className="text-sm underline">
                Fermer
              </button>
              {editingId ? (
                <button
                  type="button"
                  className={`${quietBtn} ml-auto`}
                  onClick={() => handleDelete(editingId)}
                >
                  {isProspectSheet ? 'Retirer le prospect' : 'Retirer le client'}
                </button>
              ) : null}
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  )
}

export default Clients
