import { useEffect, useRef, useState } from 'react'
import { api, apiUpload } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { fieldClass } from '../dashboard/format'
import { Avatar, primaryBtn, quietBtn } from '../dashboard/ui'
import { joinName, splitName } from './shared'

function SettingsView() {
  const { user, updateUser, logout } = useAuth()
  const fileRef = useRef(null)
  const parts = splitName(user.name)
  const [firstName, setFirstName] = useState(parts.firstName)
  const [lastName, setLastName] = useState(parts.lastName)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pending, setPending] = useState(false)
  const [photoPending, setPhotoPending] = useState(false)

  useEffect(() => {
    const next = splitName(user.name)
    setFirstName(next.firstName)
    setLastName(next.lastName)
    setEmail(user.email)
  }, [user.name, user.email])

  async function save(event) {
    event.preventDefault()
    setError('')
    setOk('')
    setPending(true)
    try {
      const body = {
        name: joinName(firstName, lastName),
        email,
      }
      if (newPassword) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      } else if (email !== user.email) {
        body.currentPassword = currentPassword
      }
      const data = await api('/api/auth/me', { method: 'PATCH', body })
      updateUser(data.user)
      setCurrentPassword('')
      setNewPassword('')
      setOk('Profil enregistré.')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function onPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setPhotoPending(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await apiUpload('/api/auth/me/avatar', form)
      updateUser(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setPhotoPending(false)
    }
  }

  async function removePhoto() {
    setPhotoPending(true)
    try {
      const data = await api('/api/auth/me/avatar', { method: 'DELETE' })
      updateUser(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setPhotoPending(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="pointer-events-none absolute -top-6 right-8 hidden h-40 w-40 rounded-full bg-copper/15 blur-2xl lg:block" />
      <div className="grid gap-6 lg:grid-cols-[18.5rem_minmax(0,1fr)]">
      <aside className="relative overflow-hidden rounded-[1.8rem] bg-moss p-5 text-cream shadow-xl shadow-moss/20 sm:p-7">
        <div className="pointer-events-none absolute -top-10 -right-8 h-36 w-36 rounded-full bg-copper/40" />
        <div className="pointer-events-none absolute bottom-8 -left-10 h-28 w-28 rounded-full bg-cream/10" />
        <p className="relative text-[11px] font-semibold tracking-[0.2em] text-cream/50 uppercase">Fondateur</p>
        <div className="relative z-10 mt-6 flex flex-col items-center text-center">
          <Avatar user={user} light className="h-28 w-28 text-2xl ring-4 ring-cream/15" />
          <h2 className="mt-4 font-display text-2xl tracking-tight sm:text-3xl">{user.name}</h2>
          <p className="mt-1 text-sm text-cream/65">{user.email}</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              disabled={photoPending}
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {photoPending ? 'Envoi…' : user.avatar ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {user.avatar ? (
              <button type="button" onClick={removePhoto} className="text-sm text-cream/60 underline">
                Retirer
              </button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        </div>
      </aside>

      <form onSubmit={save} className="relative rounded-[1.8rem] bg-cream p-6 ring-1 ring-ink/6 sm:p-8">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Votre fiche</p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">Prénom et nom</h2>
        <p className="mt-2 text-sm text-ink-soft">Ce que voient les visiteurs sur nolyo.fr/rdv.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Prénom
            <input className={fieldClass} value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            Nom
            <input className={fieldClass} value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            E-mail
            <input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            Mot de passe actuel
            <input
              className={fieldClass}
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="block text-sm font-medium">
            Nouveau mot de passe
            <input
              className={fieldClass}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-ink-soft">Le mot de passe actuel est demandé pour changer l’e-mail ou le mot de passe.</p>
        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
        {ok ? <p className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">{ok}</p> : null}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" className={quietBtn} onClick={() => logout()}>
            Déconnexion
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}

export default SettingsView
