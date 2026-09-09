import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiUpload } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { ghostBtn, primaryBtn, quietBtn } from './ui'
import { ACCENT_PRESETS, BACKGROUND_PRESETS, SURFACE_PRESETS, parseHex, pickTheme } from '../../data/pageTheme'
import { ServicesEditor } from './ServicesEditor'
import { PageReviewsEditor } from './PageReviewsEditor'

const studioField =
  'mt-1.5 w-full rounded-2xl border border-ink/15 bg-[#faf8f5] px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-copper focus:ring-2 focus:ring-copper/15'

const emptyPerson = { name: '', role: '', bio: '', photo: '' }

const DAY_OPTIONS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mer' },
  { id: 4, label: 'Jeu' },
  { id: 5, label: 'Ven' },
  { id: 6, label: 'Sam' },
  { id: 0, label: 'Dim' },
]

const emptyHours = {
  workStart: '09:00',
  workEnd: '18:00',
  workDays: [1, 2, 3, 4, 5],
  note: '',
}

const DEFAULT_CLIENT_EMAIL_SUBJECT = 'Confirmation — {{prestation}} le {{date}}'
const DEFAULT_CLIENT_EMAIL_BODY = `Bonjour {{prenom}},

Votre rendez-vous « {{prestation}} » est confirmé le {{date}} à {{heure}}.

À bientôt,
{{entreprise}}`

function emailFormFromUser(user) {
  return {
    subject: user.notifications?.clientBookingEmailSubject || DEFAULT_CLIENT_EMAIL_SUBJECT,
    body: user.notifications?.clientBookingEmailBody || DEFAULT_CLIENT_EMAIL_BODY,
  }
}

const emptyPage = {
  slug: '',
  published: false,
  title: '',
  description: '',
  photos: ['', '', ''],
  banner: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  website: '',
  address: '',
  city: '',
  postalCode: '',
  lat: '',
  lng: '',
  phone: '',
  email: '',
  hours: { ...emptyHours, workDays: [...emptyHours.workDays] },
  theme: { accent: '#c45c26', background: '#f3eee4', surface: '#ffffff' },
  about: { body: '', people: [] },
}

function pageFromUser(user) {
  const source = user?.page || {}
  const hours = source.hours || {}
  return {
    ...emptyPage,
    ...source,
    photos: [0, 1, 2].map((i) => source.photos?.[i] || ''),
    banner: source.banner || '',
    city: source.city || '',
    postalCode: source.postalCode || '',
    lat: source.lat != null && source.lat !== '' ? String(source.lat) : '',
    lng: source.lng != null && source.lng !== '' ? String(source.lng) : '',
    hours: {
      workStart: hours.workStart || emptyHours.workStart,
      workEnd: hours.workEnd || emptyHours.workEnd,
      workDays: Array.isArray(hours.workDays) && hours.workDays.length ? [...hours.workDays] : [...emptyHours.workDays],
      note: hours.note || '',
    },
    theme: pickTheme(source.theme),
    about: {
      body: source.about?.body || '',
      people: Array.isArray(source.about?.people)
        ? source.about.people.map((person) => ({
            name: person.name || '',
            role: person.role || '',
            bio: person.bio || '',
            photo: person.photo || '',
          }))
        : [],
    },
  }
}

function StudioPanel({ title, hint, children }) {
  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-ink/10 sm:p-7">
      {title ? (
        <div className="mb-5">
          <h2 className="font-display text-2xl tracking-tight text-ink">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-ink-soft">{hint}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

function StepTab({ id, label, hint, current, onPick }) {
  const active = current === id
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      className={`shrink-0 rounded-[1.35rem] px-4 py-3 text-left transition sm:min-w-0 sm:flex-1 ${
        active ? 'bg-moss text-cream shadow-sm' : 'bg-transparent text-ink hover:bg-white/80'
      }`}
    >
      <span className="block text-sm font-medium">{label}</span>
      {hint ? (
        <span className={`mt-0.5 hidden text-xs sm:block ${active ? 'text-cream/70' : 'text-ink-soft'}`}>{hint}</span>
      ) : null}
    </button>
  )
}

function ColorRow({ label, hint, value, presets, onChange }) {
  const hex = parseHex(value, presets[0])
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            onClick={() => onChange(color)}
            className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-white ${
              hex.toLowerCase() === color ? 'ring-ink' : 'ring-transparent'
            }`}
            style={{ background: color }}
          />
        ))}
        <label className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-ink/15" title="Nuancier">
          <input
            type="color"
            value={hex}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <span className="block h-full w-full" style={{ background: hex }} />
        </label>
        <input
          className={`${studioField} mt-0 w-28 py-2`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#c45c26"
          spellCheck={false}
          aria-label={`${label} hexadecimale`}
        />
      </div>
    </div>
  )
}

export function PageStudio({ showQr, isPro }) {
  const { user, updateUser } = useAuth()
  const [section, setSection] = useState('home')
  const [page, setPage] = useState(() => pageFromUser(user))
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pending, setPending] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState('')
  const [copied, setCopied] = useState(false)
  const [emailForm, setEmailForm] = useState(() => emailFormFromUser(user))
  const [emailPending, setEmailPending] = useState(false)
  const [emailOk, setEmailOk] = useState('')
  const [emailError, setEmailError] = useState('')
  const publicUrl = page.slug ? `${window.location.origin}/p/${page.slug}` : ''

  useEffect(() => {
    setPage(pageFromUser(user))
  }, [user.id])

  useEffect(() => {
    setEmailForm(emailFormFromUser(user))
  }, [user.notifications?.clientBookingEmailSubject, user.notifications?.clientBookingEmailBody])

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setPage((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function updateTheme(key, value) {
    setPage((current) => ({
      ...current,
      theme: { ...pickTheme(current.theme), [key]: value },
    }))
  }

  function updateAboutBody(value) {
    setPage((current) => ({
      ...current,
      about: { ...current.about, body: value },
    }))
  }

  function updatePerson(index, key, value) {
    setPage((current) => {
      const people = [...(current.about.people || [])]
      people[index] = { ...emptyPerson, ...people[index], [key]: value }
      return { ...current, about: { ...current.about, people } }
    })
  }

  function addPerson() {
    setPage((current) => {
      const people = [...(current.about.people || [])]
      if (people.length >= 6) return current
      return { ...current, about: { ...current.about, people: [...people, { ...emptyPerson }] } }
    })
  }

  function removePerson(index) {
    setPage((current) => ({
      ...current,
      about: {
        ...current.about,
        people: (current.about.people || []).filter((_, i) => i !== index),
      },
    }))
  }

  function updateHours(key, value) {
    setPage((current) => ({
      ...current,
      hours: { ...current.hours, [key]: value },
    }))
  }

  function toggleWorkDay(day) {
    setPage((current) => {
      const days = new Set(current.hours?.workDays || [])
      if (days.has(day)) days.delete(day)
      else days.add(day)
      return {
        ...current,
        hours: { ...current.hours, workDays: [...days].sort((a, b) => a - b) },
      }
    })
  }

  async function locateAddress(silent = false) {
    const query = [page.address, page.postalCode, page.city].filter(Boolean).join(', ')
    if (!query) {
      if (!silent) setError('Indiquez une adresse ou une ville pour la placer sur la carte.')
      return null
    }
    if (!silent) {
      setError('')
      setPendingPhoto('geo')
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { Accept: 'application/json' } },
      )
      const data = await res.json()
      if (!data?.[0]) {
        if (!silent) setError('Adresse introuvable. Vérifiez le texte (numéro, rue, ville).')
        return null
      }
      const lat = String(Number(data[0].lat).toFixed(6))
      const lng = String(Number(data[0].lon).toFixed(6))
      setPage((current) => ({ ...current, lat, lng }))
      if (!silent) setOk('Carte placée.')
      return { lat: Number(lat), lng: Number(lng) }
    } catch {
      if (!silent) setError('Impossible de placer l’adresse pour le moment.')
      return null
    } finally {
      if (!silent) setPendingPhoto('')
    }
  }

  async function savePage(event) {
    event.preventDefault()
    setError('')
    setOk('')
    setPending(true)
    try {
      let lat = page.lat === '' ? null : Number(page.lat)
      let lng = page.lng === '' ? null : Number(page.lng)
      const hasAddress = Boolean(page.address || page.city)
      if (hasAddress && (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng))) {
        const geo = await locateAddress(true)
        if (geo) {
          lat = geo.lat
          lng = geo.lng
        }
      }
      const payload = {
        ...page,
        theme: pickTheme(page.theme),
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        hours: {
          workStart: page.hours?.workStart || '09:00',
          workEnd: page.hours?.workEnd || '18:00',
          workDays: page.hours?.workDays || [1, 2, 3, 4, 5],
          note: page.hours?.note || '',
        },
      }
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: { page: payload },
      })
      updateUser(data.user)
      setPage(pageFromUser(data.user))
      setOk(page.published ? 'Page publiée.' : 'Page enregistrée.')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function uploadPagePhoto(index, file) {
    if (!file) return
    setError('')
    setPendingPhoto(`page-${index}`)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('index', String(index))
      const data = await apiUpload('/api/auth/me/page/photos', body)
      updateUser(data.user)
      setPage((current) => ({
        ...current,
        photos: [0, 1, 2].map((i) => data.user.page?.photos?.[i] || ''),
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingPhoto('')
    }
  }

  async function removePagePhoto(index) {
    setPendingPhoto(`page-${index}`)
    try {
      const data = await api(`/api/auth/me/page/photos/${index}`, { method: 'DELETE' })
      updateUser(data.user)
      setPage((current) => ({
        ...current,
        photos: [0, 1, 2].map((i) => data.user.page?.photos?.[i] || ''),
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingPhoto('')
    }
  }

  async function uploadBanner(file) {
    if (!file) return
    setError('')
    setPendingPhoto('banner')
    try {
      const body = new FormData()
      body.append('file', file)
      const data = await apiUpload('/api/auth/me/page/banner', body)
      updateUser(data.user)
      setPage((current) => ({ ...current, banner: data.user.page?.banner || '' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingPhoto('')
    }
  }

  async function removeBanner() {
    setPendingPhoto('banner')
    try {
      const data = await api('/api/auth/me/page/banner', { method: 'DELETE' })
      updateUser(data.user)
      setPage((current) => ({ ...current, banner: '' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingPhoto('')
    }
  }

  async function uploadPersonPhoto(index, file) {
    if (!file) return
    setError('')
    setPendingPhoto(`person-${index}`)
    try {
      await api('/api/auth/me', {
        method: 'PATCH',
        body: { page: { ...page, theme: pickTheme(page.theme) } },
      })
      const payload = new FormData()
      payload.append('file', file)
      const uploaded = await apiUpload(`/api/auth/me/page/people/${index}/photo`, payload)
      updateUser(uploaded.user)
      setPage(pageFromUser(uploaded.user))
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingPhoto('')
    }
  }

  async function copyLink() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Impossible de copier le lien.')
    }
  }

  async function saveClientEmail(event) {
    event.preventDefault()
    setEmailError('')
    setEmailOk('')
    setEmailPending(true)
    try {
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          notifications: {
            clientBookingEmailSubject: emailForm.subject,
            clientBookingEmailBody: emailForm.body,
          },
        },
      })
      updateUser(data.user)
      setEmailOk('E-mail client enregistré.')
    } catch (err) {
      setEmailError(err.message)
    } finally {
      setEmailPending(false)
    }
  }

  if (!isPro) return null

  const people = page.about?.people || []
  const mapLat = page.lat ? Number(page.lat) : NaN
  const mapLng = page.lng ? Number(page.lng) : NaN
  const hasMap = Number.isFinite(mapLat) && Number.isFinite(mapLng)
  const mapPreviewSrc = hasMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - 0.012}%2C${mapLat - 0.012}%2C${mapLng + 0.012}%2C${mapLat + 0.012}&layer=mapnik&marker=${mapLat}%2C${mapLng}`
    : ''

  const showForm = section === 'home' || section === 'hours' || section === 'about' || section === 'colors'

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-ink/8 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="flex items-center gap-3 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              name="published"
              checked={Boolean(page.published)}
              onChange={updateField}
              className="h-4 w-4 accent-moss"
            />
            {page.published ? 'La page est visible' : 'La page est encore privée'}
          </label>
          <p className="mt-1 pl-7 text-xs text-ink-soft">
            {page.published ? 'Vos clients peuvent l’ouvrir avec le lien.' : 'Cochez pour la mettre en ligne.'}
          </p>
        </div>
        {page.slug ? (
          <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0">
            <a href={publicUrl} target="_blank" rel="noreferrer" className={ghostBtn}>
              Voir
            </a>
            <button type="button" onClick={copyLink} className={ghostBtn}>
              {copied ? 'Lien copié' : 'Copier le lien'}
            </button>
            {showQr ? (
              <Link to="/dashboard/qr-code" className={ghostBtn}>
                QR Code
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-[2rem] bg-[#f3eee4]/80 p-2 ring-1 ring-ink/8">
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5">
          <StepTab id="home" label="Infos" hint="Texte et contact" current={section} onPick={setSection} />
          <StepTab id="hours" label="Horaires" hint="Ouverture" current={section} onPick={setSection} />
          <StepTab id="services" label="Prestations" hint="Titres et tarifs" current={section} onPick={setSection} />
          <StepTab id="reviews" label="Avis" hint="À valider" current={section} onPick={setSection} />
          <StepTab id="email" label="E-mail" hint="Au client" current={section} onPick={setSection} />
          <StepTab id="about" label="À propos" hint="Équipe" current={section} onPick={setSection} />
          <StepTab id="colors" label="Style" hint="Couleurs" current={section} onPick={setSection} />
        </div>
      </div>

      {section === 'services' ? (
        <StudioPanel title="Prestations" hint="Créez des titres, puis rattachez chaque prestation.">
          <ServicesEditor />
        </StudioPanel>
      ) : null}

      {section === 'reviews' ? (
        <StudioPanel>
          <PageReviewsEditor />
        </StudioPanel>
      ) : null}

      {section === 'email' ? (
        <StudioPanel
          title="E-mail envoyé au client"
          hint="Quand quelqu’un réserve sur votre page, il reçoit ce message. Vous pouvez le personnaliser."
        >
          <form onSubmit={saveClientEmail} className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  ['{{prenom}}', 'Prénom'],
                  ['{{prestation}}', 'Prestation'],
                  ['{{date}}', 'Date'],
                  ['{{heure}}', 'Heure'],
                  ['{{entreprise}}', 'Entreprise'],
                ].map(([token, label]) => (
                  <button
                    key={token}
                    type="button"
                    className="rounded-full bg-[#faf8f5] px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-ink/10 transition hover:ring-copper/40"
                    onClick={() =>
                      setEmailForm((current) => ({
                        ...current,
                        body: `${current.body || ''}${current.body ? ' ' : ''}${token}`,
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="block text-sm font-semibold text-ink">
                Objet
                <input
                  className={studioField}
                  value={emailForm.subject}
                  onChange={(event) => setEmailForm((c) => ({ ...c, subject: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-semibold text-ink">
                Message
                <textarea
                  className={`${studioField} min-h-56 resize-y`}
                  value={emailForm.body}
                  onChange={(event) => setEmailForm((c) => ({ ...c, body: event.target.value }))}
                />
              </label>
              {emailError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{emailError}</p> : null}
              {emailOk ? <p className="text-sm font-medium text-moss">{emailOk}</p> : null}
              <button type="submit" disabled={emailPending} className={primaryBtn}>
                {emailPending ? 'Enregistrement…' : 'Enregistrer l’e-mail'}
              </button>
            </div>

            <div className="rounded-[1.5rem] bg-[#faf8f5] p-5 ring-1 ring-ink/8 sm:p-6">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Aperçu</p>
              <div className="mt-4 overflow-hidden rounded-[1.25rem] bg-white shadow-sm ring-1 ring-ink/8">
                <div className="border-b border-ink/8 bg-moss px-5 py-4">
                  <p className="text-xs text-cream/70">À · client@email.com</p>
                  <p className="mt-1 font-medium text-cream">
                    {emailForm.subject || 'Confirmation — Massage le 12 mars'}
                  </p>
                </div>
                <div className="space-y-3 px-5 py-6 text-sm leading-relaxed text-ink whitespace-pre-line">
                  {emailForm.body ||
                    'Bonjour Marie,\n\nVotre rendez-vous « Massage » est confirmé le 12 mars à 14:00.\n\nÀ bientôt,\nMaison Sève'}
                </div>
              </div>
              <p className="mt-4 text-xs text-ink-soft">
                Les variables sont remplacées automatiquement à l’envoi (prénom, prestation, date…).
              </p>
            </div>
          </form>
        </StudioPanel>
      ) : null}

      {showForm ? (
        <form onSubmit={savePage} className="space-y-6">
          {section === 'home' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <StudioPanel title="Votre page" hint="Ce que vos clients lisent en premier.">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-ink">
                    Lien de la page
                    <span className="mt-1.5 flex items-center gap-2 rounded-2xl border border-ink/15 bg-[#faf8f5] px-4 py-3 focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/15">
                      <span className="shrink-0 text-sm text-ink-soft">/p/</span>
                      <input
                        className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                        name="slug"
                        value={page.slug}
                        onChange={updateField}
                        placeholder="maison-seve"
                      />
                    </span>
                  </label>
                  <label className="block text-sm font-semibold text-ink">
                    Titre
                    <input
                      className={studioField}
                      name="title"
                      value={page.title}
                      onChange={updateField}
                      placeholder="Maison Sève — soins & rituels, Lyon"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-ink">
                    Présentation
                    <textarea
                      className={`${studioField} min-h-36 resize-y`}
                      name="description"
                      value={page.description}
                      onChange={updateField}
                      placeholder="Qui vous êtes, pour qui vous travaillez."
                    />
                  </label>
                </div>
              </StudioPanel>

              <StudioPanel title="Photos" hint="Une bannière en haut, trois photos plus bas.">
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-ink">Bannière</p>
                    <div className="mt-1.5 overflow-hidden rounded-2xl bg-[#faf8f5] ring-1 ring-ink/10">
                      {page.banner ? (
                        <img src={page.banner} alt="" className="aspect-21/9 w-full object-cover" />
                      ) : (
                        <div className="grid aspect-21/9 place-items-center text-xs text-ink-soft">Image large</div>
                      )}
                      <div className="flex flex-wrap gap-2 p-2">
                        <label className={`${quietBtn} cursor-pointer`}>
                          {pendingPhoto === 'banner' ? 'Envoi…' : page.banner ? 'Changer' : 'Ajouter'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(event) => {
                              uploadBanner(event.target.files?.[0])
                              event.target.value = ''
                            }}
                          />
                        </label>
                        {page.banner ? (
                          <button type="button" className={quietBtn} onClick={removeBanner}>
                            Retirer
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Photos</p>
                    <ul className="mt-1.5 grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((index) => (
                        <li key={index} className="overflow-hidden rounded-2xl bg-[#faf8f5] ring-1 ring-ink/10">
                          {page.photos[index] ? (
                            <img src={page.photos[index]} alt="" className="aspect-4/5 w-full object-cover" />
                          ) : (
                            <div className="grid aspect-4/5 place-items-center text-xs text-ink-soft">{index + 1}</div>
                          )}
                          <div className="flex flex-wrap gap-2 p-2">
                            <label className={`${quietBtn} cursor-pointer`}>
                              {pendingPhoto === `page-${index}` ? 'Envoi…' : page.photos[index] ? 'Changer' : 'Ajouter'}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                onChange={(event) => {
                                  uploadPagePhoto(index, event.target.files?.[0])
                                  event.target.value = ''
                                }}
                              />
                            </label>
                            {page.photos[index] ? (
                              <button type="button" className={quietBtn} onClick={() => removePagePhoto(index)}>
                                Retirer
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </StudioPanel>

              <div className="lg:col-span-2">
                <StudioPanel title="Contact et adresse" hint="Affichés à côté de la page. La carte se place toute seule.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-ink">
                      Téléphone
                      <input className={studioField} name="phone" value={page.phone} onChange={updateField} />
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      E-mail
                      <input className={studioField} name="email" value={page.email} onChange={updateField} />
                    </label>
                    <label className="block text-sm font-semibold text-ink sm:col-span-2">
                      Adresse
                      <input
                        className={studioField}
                        name="address"
                        value={page.address}
                        onChange={updateField}
                        placeholder="12 rue des Lilas"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      Code postal
                      <input className={studioField} name="postalCode" value={page.postalCode} onChange={updateField} />
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      Ville
                      <input className={studioField} name="city" value={page.city} onChange={updateField} />
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      Site
                      <input className={studioField} name="website" value={page.website} onChange={updateField} />
                    </label>
                    <label className="block text-sm font-semibold text-ink">
                      Instagram
                      <input className={studioField} name="instagram" value={page.instagram} onChange={updateField} />
                    </label>
                    <label className="block text-sm font-semibold text-ink sm:col-span-2">
                      Facebook
                      <input className={studioField} name="facebook" value={page.facebook} onChange={updateField} />
                    </label>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className={ghostBtn}
                      onClick={() => locateAddress(false)}
                      disabled={pendingPhoto === 'geo'}
                    >
                      {pendingPhoto === 'geo' ? 'Placement…' : 'Placer sur la carte'}
                    </button>
                    {mapPreviewSrc ? (
                      <div className="mt-4 overflow-hidden rounded-[1.2rem] ring-1 ring-ink/10">
                        <iframe title="Aperçu carte" className="h-44 w-full border-0" loading="lazy" src={mapPreviewSrc} />
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-ink-soft">
                        Renseignez l’adresse puis cliquez sur « Placer sur la carte » (ou enregistrez : on le fait pour vous).
                      </p>
                    )}
                  </div>
                </StudioPanel>
              </div>
            </div>
          ) : null}

          {section === 'hours' ? (
            <StudioPanel title="Horaires d’ouverture" hint="Affichés sur votre page. Indépendants de l’agenda de rendez-vous.">
              <p className="text-sm font-semibold text-ink">Jours ouverts</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const on = (page.hours?.workDays || []).includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWorkDay(day.id)}
                      className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                        on ? 'bg-moss text-cream' : 'bg-[#faf8f5] text-ink-soft ring-1 ring-ink/12'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-ink">
                  Ouverture
                  <input
                    className={studioField}
                    type="time"
                    value={page.hours?.workStart || '09:00'}
                    onChange={(event) => updateHours('workStart', event.target.value)}
                  />
                </label>
                <label className="block text-sm font-semibold text-ink">
                  Fermeture
                  <input
                    className={studioField}
                    type="time"
                    value={page.hours?.workEnd || '18:00'}
                    onChange={(event) => updateHours('workEnd', event.target.value)}
                  />
                </label>
                <label className="block text-sm font-semibold text-ink sm:col-span-2">
                  Note (optionnel)
                  <input
                    className={studioField}
                    value={page.hours?.note || ''}
                    onChange={(event) => updateHours('note', event.target.value)}
                    placeholder="Sur rendez-vous le samedi…"
                  />
                </label>
              </div>
            </StudioPanel>
          ) : null}

          {section === 'about' ? (
            <StudioPanel title="À propos" hint="Un texte, puis vous — ou l’équipe. Jusqu’à 6 personnes.">
              <label className="block text-sm font-semibold text-ink">
                Texte
                <textarea
                  className={`${studioField} min-h-36 resize-y`}
                  value={page.about?.body || ''}
                  onChange={(event) => updateAboutBody(event.target.value)}
                  placeholder="Quelques lignes sur la maison, la façon de travailler."
                />
              </label>
              <div className="mt-6 flex items-end justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Personnes</p>
                {people.length < 6 ? (
                  <button type="button" className={quietBtn} onClick={addPerson}>
                    Ajouter une personne
                  </button>
                ) : null}
              </div>
              {people.length ? (
                <ul className="mt-4 grid gap-4 lg:grid-cols-2">
                  {people.map((person, index) => (
                    <li key={index} className="flex gap-4 rounded-[1.4rem] border border-ink/12 bg-[#faf8f5] p-4">
                      <div className="w-28 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-ink/10">
                        {person.photo ? (
                          <img src={person.photo} alt="" className="aspect-square w-full object-cover" />
                        ) : (
                          <div className="grid aspect-square place-items-center text-[11px] text-ink-soft">Photo</div>
                        )}
                        <div className="flex flex-wrap gap-1 p-1.5">
                          <label className={`${quietBtn} cursor-pointer`}>
                            {pendingPhoto === `person-${index}` ? '…' : person.photo ? 'Changer' : 'Ajouter'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(event) => {
                                uploadPersonPhoto(index, event.target.files?.[0])
                                event.target.value = ''
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          className={studioField}
                          value={person.name}
                          onChange={(event) => updatePerson(index, 'name', event.target.value)}
                          placeholder="Nom"
                          aria-label="Nom"
                        />
                        <input
                          className={studioField}
                          value={person.role}
                          onChange={(event) => updatePerson(index, 'role', event.target.value)}
                          placeholder="Rôle"
                          aria-label="Rôle"
                        />
                        <textarea
                          className={`${studioField} min-h-24 resize-y`}
                          value={person.bio}
                          onChange={(event) => updatePerson(index, 'bio', event.target.value)}
                          placeholder="Deux ou trois phrases."
                          aria-label="Présentation"
                        />
                        <button type="button" className={quietBtn} onClick={() => removePerson(index)}>
                          Enlever
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-[1.4rem] border border-dashed border-ink/15 bg-[#faf8f5] px-5 py-8 text-sm text-ink-soft">
                  Ajoutez-vous, ou l’équipe.
                </p>
              )}
            </StudioPanel>
          ) : null}

          {section === 'colors' ? (
            <StudioPanel title="Style" hint="Fonds clairs recommandés pour bien lire titres et textes.">
              <div
                className="overflow-hidden rounded-[1.5rem] ring-1 ring-ink/10"
                style={{ background: page.theme?.background || '#f3eee4' }}
              >
                <div className="px-6 py-10 sm:px-10 sm:py-12">
                  <p className="font-display text-4xl" style={{ color: page.theme?.accent || '#c45c26' }}>
                    Aperçu
                  </p>
                  <div
                    className="mt-6 max-w-md rounded-2xl px-5 py-4 text-sm shadow-sm"
                    style={{ background: page.theme?.surface || '#ffffff', color: '#243026' }}
                  >
                    Une carte, comme sur votre page.
                  </div>
                  <span
                    className="mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                    style={{ background: page.theme?.accent || '#c45c26', color: '#faf7f1' }}
                  >
                    Un bouton
                  </span>
                </div>
              </div>
              <div className="mt-8 grid gap-8 lg:grid-cols-3">
                <ColorRow
                  label="Boutons et titres"
                  value={page.theme?.accent || '#c45c26'}
                  presets={ACCENT_PRESETS}
                  onChange={(value) => updateTheme('accent', value)}
                />
                <ColorRow
                  label="Fond de page"
                  hint="Préférez un fond clair"
                  value={page.theme?.background || '#f3eee4'}
                  presets={BACKGROUND_PRESETS}
                  onChange={(value) => updateTheme('background', value)}
                />
                <ColorRow
                  label="Cartes"
                  value={page.theme?.surface || '#ffffff'}
                  presets={SURFACE_PRESETS}
                  onChange={(value) => updateTheme('surface', value)}
                />
              </div>
            </StudioPanel>
          ) : null}

          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
          {ok ? <p className="text-sm font-medium text-moss">{ok}</p> : null}
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      ) : null}
    </div>
  )
}
