import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiUpload } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { fieldClass } from './format'
import { ghostBtn, primaryBtn, quietBtn } from './ui'
import { ACCENT_PRESETS, BACKGROUND_PRESETS, SURFACE_PRESETS, parseHex, pickTheme } from '../../data/pageTheme'

const emptyPerson = { name: '', role: '', bio: '', photo: '' }

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
  phone: '',
  email: '',
  theme: { accent: '#c45c26', background: '#f3eee4', surface: '#ffffff' },
  about: { body: '', people: [] },
}

function pageFromUser(user) {
  const source = user?.page || {}
  return {
    ...emptyPage,
    ...source,
    photos: [0, 1, 2].map((i) => source.photos?.[i] || ''),
    banner: source.banner || '',
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

function ColorRow({ label, hint, value, presets, onChange }) {
  const hex = parseHex(value, presets[0])
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            onClick={() => onChange(color)}
            className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-cream ${
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
          className={`${fieldClass} mt-0 w-28 py-2`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#c45c26"
          spellCheck={false}
          aria-label={`${label} hexadécimal`}
        />
      </div>
    </div>
  )
}

function StepTab({ id, n, label, hint, current, onPick }) {
  const active = current === id
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      className={`flex min-w-0 flex-1 items-start gap-3 rounded-[1.3rem] px-4 py-3.5 text-left transition ${
        active ? 'bg-moss text-cream shadow-sm' : 'bg-cream text-ink ring-1 ring-ink/8 hover:ring-copper/40'
      }`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          active ? 'bg-cream/15' : 'bg-moss/10 text-moss'
        }`}
      >
        {n}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className={`mt-0.5 block text-xs ${active ? 'text-cream/70' : 'text-ink-soft'}`}>{hint}</span>
      </span>
    </button>
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
  const publicUrl = page.slug ? `${window.location.origin}/p/${page.slug}` : ''

  useEffect(() => {
    setPage(pageFromUser(user))
  }, [user.id])

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

  async function savePage(event) {
    event.preventDefault()
    setError('')
    setOk('')
    setPending(true)
    try {
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: { page: { ...page, theme: pickTheme(page.theme) } },
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
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: { page: { ...page, theme: pickTheme(page.theme) } },
      })
      updateUser(data.user)
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

  async function removePersonPhoto(index) {
    setPendingPhoto(`person-${index}`)
    try {
      const data = await api(`/api/auth/me/page/people/${index}/photo`, { method: 'DELETE' })
      updateUser(data.user)
      setPage((current) => {
        const people = [...(current.about.people || [])]
        if (people[index]) people[index] = { ...people[index], photo: '' }
        return { ...current, about: { ...current.about, people } }
      })
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

  if (!isPro) {
    return null
  }

  const people = page.about?.people || []

  return (
    <form onSubmit={savePage} className="mt-8 space-y-8">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-ink/8 bg-cream px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="flex items-center gap-3 text-sm font-medium">
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
          <div className="flex flex-wrap items-center gap-2 sm:pl-0 pl-7">
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

      <div className="grid gap-2 sm:grid-cols-3">
        <StepTab id="home" n="1" label="Accueil" hint="Titre, texte, photos" current={section} onPick={setSection} />
        <StepTab id="about" n="2" label="À propos" hint="Vous, ou l’équipe" current={section} onPick={setSection} />
        <StepTab id="colors" n="3" label="Couleurs" hint="Boutons et fond" current={section} onPick={setSection} />
      </div>

      {section === 'home' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <p className="font-display text-2xl">Le texte</p>
              <p className="mt-1 text-sm text-ink-soft">Ce que l’on lit en ouvrant votre page.</p>
            </div>
            <label className="block text-sm font-medium">
              Adresse
              <span className="mt-1.5 flex items-center gap-2 rounded-2xl border border-ink/10 bg-paper px-4 py-3 focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/15">
                <span className="shrink-0 text-sm text-ink-soft">/p/</span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  name="slug"
                  value={page.slug}
                  onChange={updateField}
                  placeholder="maison-seve"
                />
              </span>
            </label>
            <label className="block text-sm font-medium">
              Titre
              <input
                className={fieldClass}
                name="title"
                value={page.title}
                onChange={updateField}
                placeholder="Maison Sève — soins & rituels, Lyon"
              />
            </label>
            <label className="block text-sm font-medium">
              Présentation
              <textarea
                className={`${fieldClass} min-h-36 resize-y`}
                name="description"
                value={page.description}
                onChange={updateField}
                placeholder="Qui vous êtes, pour qui vous travaillez."
              />
            </label>
            <div>
              <p className="text-sm font-medium">Comment vous joindre</p>
              <p className="mt-0.5 text-xs text-ink-soft">Optionnel. Affiché sur le côté de la page.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-ink-soft">
                  Téléphone
                  <input className={fieldClass} name="phone" value={page.phone} onChange={updateField} />
                </label>
                <label className="block text-xs font-medium text-ink-soft">
                  E-mail
                  <input className={fieldClass} name="email" value={page.email} onChange={updateField} />
                </label>
                <label className="block text-xs font-medium text-ink-soft">
                  Adresse
                  <input className={fieldClass} name="address" value={page.address} onChange={updateField} />
                </label>
                <label className="block text-xs font-medium text-ink-soft">
                  Site
                  <input className={fieldClass} name="website" value={page.website} onChange={updateField} />
                </label>
                <label className="block text-xs font-medium text-ink-soft">
                  Instagram
                  <input className={fieldClass} name="instagram" value={page.instagram} onChange={updateField} />
                </label>
                <label className="block text-xs font-medium text-ink-soft">
                  Facebook
                  <input className={fieldClass} name="facebook" value={page.facebook} onChange={updateField} />
                </label>
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <p className="font-display text-2xl">Les images</p>
              <p className="mt-1 text-sm text-ink-soft">Une bannière en haut, trois photos plus bas.</p>
            </div>
            <div>
              <p className="text-sm font-medium">Bannière</p>
              <div className="mt-1.5 overflow-hidden rounded-2xl bg-paper ring-1 ring-ink/8">
                {page.banner ? (
                  <img src={page.banner} alt="" className="aspect-21/9 w-full object-cover" />
                ) : (
                  <div className="grid aspect-21/9 place-items-center text-xs text-ink-soft">Image large, en haut</div>
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
              <p className="text-sm font-medium">Photos</p>
              <ul className="mt-1.5 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((index) => (
                  <li key={index} className="overflow-hidden rounded-2xl bg-paper ring-1 ring-ink/8">
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
        </div>
      ) : null}

      {section === 'about' ? (
        <div className="space-y-6">
          <div>
            <p className="font-display text-2xl">Qui vous êtes</p>
            <p className="mt-1 text-sm text-ink-soft">
              Un texte, puis vous — ou l’équipe. Jusqu’à 6 personnes.
            </p>
          </div>
          <label className="block text-sm font-medium">
            Texte
            <textarea
              className={`${fieldClass} min-h-36 resize-y`}
              value={page.about?.body || ''}
              onChange={(event) => updateAboutBody(event.target.value)}
              placeholder="Quelques lignes sur la maison, la façon de travailler."
            />
          </label>
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm font-medium">Personnes</p>
            {people.length < 6 ? (
              <button type="button" className={quietBtn} onClick={addPerson}>
                Ajouter une personne
              </button>
            ) : null}
          </div>
          {people.length ? (
            <ul className="grid gap-4 lg:grid-cols-2">
              {people.map((person, index) => (
                <li key={index} className="flex gap-4 rounded-[1.4rem] border border-ink/8 bg-cream p-4">
                  <div className="w-28 shrink-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-ink/8">
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
                      className={fieldClass}
                      value={person.name}
                      onChange={(event) => updatePerson(index, 'name', event.target.value)}
                      placeholder="Nom"
                      aria-label="Nom"
                    />
                    <input
                      className={fieldClass}
                      value={person.role}
                      onChange={(event) => updatePerson(index, 'role', event.target.value)}
                      placeholder="Rôle"
                      aria-label="Rôle"
                    />
                    <textarea
                      className={`${fieldClass} min-h-24 resize-y`}
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
            <p className="rounded-[1.4rem] border border-dashed border-ink/12 bg-cream/50 px-5 py-8 text-sm text-ink-soft">
              Ajoutez-vous, ou l’équipe.
            </p>
          )}
        </div>
      ) : null}

      {section === 'colors' ? (
        <div className="space-y-6">
          <div>
            <p className="font-display text-2xl">L’apparence</p>
            <p className="mt-1 text-sm text-ink-soft">Trois couleurs. Cliquez, ou collez un code.</p>
          </div>
          <div
            className="overflow-hidden rounded-[1.5rem] ring-1 ring-ink/8"
            style={{ background: page.theme?.background || '#f3eee4' }}
          >
            <div className="px-6 py-10 sm:px-10 sm:py-12">
              <p className="font-display text-4xl" style={{ color: page.theme?.accent || '#c45c26' }}>
                Aperçu
              </p>
              <div
                className="mt-6 max-w-md rounded-2xl px-5 py-4 text-sm shadow-sm"
                style={{ background: page.theme?.surface || '#ffffff' }}
              >
                Une carte, comme sur votre page.
              </div>
              <span
                className="mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{
                  background: page.theme?.accent || '#c45c26',
                  color: '#faf7f1',
                }}
              >
                Un bouton
              </span>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <ColorRow
              label="Boutons et titres"
              value={page.theme?.accent || '#c45c26'}
              presets={ACCENT_PRESETS}
              onChange={(value) => updateTheme('accent', value)}
            />
            <ColorRow
              label="Fond de page"
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
        </div>
      ) : null}

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {ok ? <p className="text-sm text-moss">{ok}</p> : null}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
