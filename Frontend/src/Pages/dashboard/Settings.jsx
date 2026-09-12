import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, apiUpload } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { fieldClass, normalizeDepositPlan } from './format'
import { DepositPlanEditor } from './DepositPlanEditor'
import { ServicesEditor } from './ServicesEditor'
import { Accordion, Avatar, PageHeader, PageShell, ghostBtn, icons, primaryBtn, quietBtn } from './ui'
import { MODULES, workspaceForUser } from '../../data/workspace'
import { ensurePushSubscription } from '../../utils/push'
import { passwordStrengthError } from '../../utils/password'

const LEGAL_FORMS = [
  'Micro-entreprise',
  'EI',
  'EURL',
  'SARL',
  'SASU',
  'SAS',
  'SA',
  'Profession libérale',
  'Association',
  'Autre',
]

const emptyBusiness = {
  legalName: '',
  tradeName: '',
  legalForm: '',
  siret: '',
  vatNumber: '',
  apeCode: '',
  rcs: '',
  capital: '',
  address: '',
  addressExtra: '',
  postalCode: '',
  city: '',
  country: 'France',
  phone: '',
  website: '',
  iban: '',
  bic: '',
}

function Settings() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const isPro = isProPlan(user)
  const [open, setOpen] = useState({
    workspace: true,
    services: false,
    account: false,
    business: false,
    deposits: false,
    followUp: false,
    notifications: false,
    password: false,
    session: false,
    deletion: false,
  })
  const [pane, setPane] = useState('settings')
  const [profile, setProfile] = useState({ name: user.name, email: user.email })
  const [business, setBusiness] = useState({ ...emptyBusiness, ...(user.business || {}) })
  const [workspace, setWorkspace] = useState(() => workspaceForUser(user))
  const [depositPlan, setDepositPlan] = useState(() => normalizeDepositPlan(user.depositPlan))
  const [followUp, setFollowUp] = useState({
    quoteFollowUpDays: user.quoteFollowUpDays ?? 3,
    quoteFollowUpChannel:
      user.quoteFollowUpChannel === 'phone' || user.quoteFollowUpChannel === 'both'
        ? user.quoteFollowUpChannel
        : 'email',
  })
  const [notif, setNotif] = useState(() => ({
    emailBooking: user.notifications?.emailBooking !== false,
    pushBooking: user.notifications?.pushBooking !== false,
    pushReminders: user.notifications?.pushReminders !== false,
    pushRelances: user.notifications?.pushRelances !== false,
    reminderMinutes: user.notifications?.reminderMinutes || 15,
    clientBookingEmailSubject: user.notifications?.clientBookingEmailSubject || '',
    clientBookingEmailBody: user.notifications?.clientBookingEmailBody || '',
  }))
  const [notifError, setNotifError] = useState('')
  const [notifOk, setNotifOk] = useState('')
  const [pendingNotif, setPendingNotif] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [businessError, setBusinessError] = useState('')
  const [profileOk, setProfileOk] = useState('')
  const [passwordOk, setPasswordOk] = useState('')
  const [businessOk, setBusinessOk] = useState('')
  const [depositError, setDepositError] = useState('')
  const [depositOk, setDepositOk] = useState('')
  const [followUpError, setFollowUpError] = useState('')
  const [followUpOk, setFollowUpOk] = useState('')
  const [pendingProfile, setPendingProfile] = useState(false)
  const [pendingPassword, setPendingPassword] = useState(false)
  const [pendingBusiness, setPendingBusiness] = useState(false)
  const [pendingDeposit, setPendingDeposit] = useState(false)
  const [pendingFollowUp, setPendingFollowUp] = useState(false)
  const [pendingWorkspace, setPendingWorkspace] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')
  const [workspaceOk, setWorkspaceOk] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState('')
  const [deletionMessage, setDeletionMessage] = useState('')
  const [deletionError, setDeletionError] = useState('')
  const [deletionOk, setDeletionOk] = useState('')
  const [pendingDeletion, setPendingDeletion] = useState(false)
  const deletion = user.deletionRequest

  useEffect(() => {
    setProfile({ name: user.name, email: user.email })
    setBusiness({ ...emptyBusiness, ...(user.business || {}) })
    setDepositPlan(normalizeDepositPlan(user.depositPlan))
    setFollowUp({
      quoteFollowUpDays: user.quoteFollowUpDays ?? 3,
      quoteFollowUpChannel:
      user.quoteFollowUpChannel === 'phone' || user.quoteFollowUpChannel === 'both'
        ? user.quoteFollowUpChannel
        : 'email',
    })
    setNotif({
      emailBooking: user.notifications?.emailBooking !== false,
      pushBooking: user.notifications?.pushBooking !== false,
      pushReminders: user.notifications?.pushReminders !== false,
      pushRelances: user.notifications?.pushRelances !== false,
      reminderMinutes: user.notifications?.reminderMinutes || 15,
      clientBookingEmailSubject: user.notifications?.clientBookingEmailSubject || '',
      clientBookingEmailBody: user.notifications?.clientBookingEmailBody || '',
    })
    setWorkspace(workspaceForUser(user))
  }, [
    user.name,
    user.email,
    user.business,
    user.depositPlan,
    user.quoteFollowUpDays,
    user.quoteFollowUpChannel,
    user.notifications,
    user.workspace,
  ])

  useEffect(() => {
    if (params.get('suppression') !== '1') return
    setOpen((current) => ({ ...current, deletion: true }))
    const next = new URLSearchParams(params)
    next.delete('suppression')
    setParams(next, { replace: true })
    window.requestAnimationFrame(() => {
      document.getElementById('settings-deletion')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [params, setParams])

  function toggle(key) {
    setOpen((current) => ({ ...current, [key]: !current[key] }))
  }

  function updateProfile(event) {
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updateBusiness(event) {
    setBusiness((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updatePasswords(event) {
    setPasswords((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function saveBusiness(event) {
    event.preventDefault()
    setBusinessError('')
    setBusinessOk('')
    setPendingBusiness(true)
    try {
      const data = await api('/api/auth/me', { method: 'PATCH', body: { business } })
      updateUser(data.user)
      setBusinessOk('Fiche entreprise enregistrée.')
    } catch (err) {
      setBusinessError(err.message)
    } finally {
      setPendingBusiness(false)
    }
  }

  async function saveDeposits(event) {
    event.preventDefault()
    setDepositError('')
    setDepositOk('')
    setPendingDeposit(true)
    try {
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: { depositPlan: normalizeDepositPlan(depositPlan) },
      })
      updateUser(data.user)
      setDepositOk('Acomptes enregistrés.')
    } catch (err) {
      setDepositError(err.message)
    } finally {
      setPendingDeposit(false)
    }
  }

  async function saveFollowUp(event) {
    event.preventDefault()
    setFollowUpError('')
    setFollowUpOk('')
    setPendingFollowUp(true)
    try {
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          quoteFollowUpDays: Number(followUp.quoteFollowUpDays),
          quoteFollowUpChannel: followUp.quoteFollowUpChannel,
        },
      })
      updateUser(data.user)
      setFollowUpOk('Relances enregistrées.')
    } catch (err) {
      setFollowUpError(err.message)
    } finally {
      setPendingFollowUp(false)
    }
  }

  async function saveNotifications(event) {
    event.preventDefault()
    setNotifError('')
    setNotifOk('')
    setPendingNotif(true)
    try {
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: { notifications: notif },
      })
      updateUser(data.user)
      setNotifOk('Notifications enregistrées.')
    } catch (err) {
      setNotifError(err.message)
    } finally {
      setPendingNotif(false)
    }
  }

  async function enablePush() {
    setNotifError('')
    setNotifOk('')
    setPushBusy(true)
    try {
      const nextUser = await ensurePushSubscription()
      updateUser(nextUser)
      setNotifOk('Notifications activées sur cet appareil.')
      await api('/api/workspace/push/test', { method: 'POST' })
    } catch (err) {
      setNotifError(err.message)
    } finally {
      setPushBusy(false)
    }
  }

  async function persistWorkspace(next) {
    setWorkspaceError('')
    setWorkspaceOk('')
    setPendingWorkspace(true)
    try {
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          workspace: {
            displayAs: next.displayAs,
            modules: next.modules,
          },
        },
      })
      updateUser(data.user)
      setWorkspace(workspaceForUser(data.user))
      return true
    } catch (err) {
      setWorkspaceError(err.message)
      setWorkspace(workspaceForUser(user))
      return false
    } finally {
      setPendingWorkspace(false)
    }
  }

  async function saveWorkspace(event) {
    event.preventDefault()
    const ok = await persistWorkspace(workspace)
    if (ok) setWorkspaceOk('Espace enregistré.')
  }

  function setDisplayAs(value) {
    setWorkspace((current) => ({ ...current, displayAs: value }))
  }

  async function setModuleOn(id, on) {
    const item = MODULES.find((entry) => entry.id === id)
    if (item?.plan === 'pro' && !isPro) return
    const next = {
      ...workspace,
      modules: { ...workspace.modules, [id]: on },
    }
    setWorkspace(next)
    const ok = await persistWorkspace(next)
    if (ok) {
      setWorkspaceOk(on ? `${item?.label || 'Fonctionnalité'} ajoutée à votre espace.` : `${item?.label || 'Fonctionnalité'} retirée.`)
      if (on && item?.settings) {
        if (id === 'page') {
          navigate('/dashboard/page')
          return
        }
        const key = id === 'quotes' ? 'followUp' : id === 'deposits' ? 'deposits' : id === 'appointments' ? 'services' : null
        if (key) setOpen((current) => ({ ...current, [key]: true }))
      }
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    setProfileError('')
    setProfileOk('')
    setPendingProfile(true)
    try {
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          name: profile.name,
          email: profile.email,
          currentPassword: passwords.currentPassword,
        },
      })
      updateUser(data.user)
      setProfileOk('Compte enregistré.')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setPendingProfile(false)
    }
  }

  async function savePassword(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordOk('')
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }
    const strength = passwordStrengthError(passwords.newPassword)
    if (strength) {
      setPasswordError(strength)
      return
    }
    setPendingPassword(true)
    try {
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      })
      updateUser(data.user)
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' })
      setPasswordOk('Mot de passe mis à jour.')
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setPendingPassword(false)
    }
  }

  async function uploadAvatar(file) {
    if (!file) return
    setProfileError('')
    setPendingPhoto('avatar')
    try {
      const body = new FormData()
      body.append('file', file)
      const data = await apiUpload('/api/auth/me/avatar', body)
      updateUser(data.user)
      setProfileOk('Photo mise à jour.')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setPendingPhoto('')
    }
  }

  async function removeAvatar() {
    setPendingPhoto('avatar')
    try {
      const data = await api('/api/auth/me/avatar', { method: 'DELETE' })
      updateUser(data.user)
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setPendingPhoto('')
    }
  }

  async function requestDeletion(event) {
    event.preventDefault()
    setDeletionError('')
    setDeletionOk('')
    setPendingDeletion(true)
    try {
      const data = await api('/api/auth/me/deletion-request', {
        method: 'POST',
        body: { message: deletionMessage },
      })
      updateUser(data.user)
      setDeletionMessage('')
      setDeletionOk('Message envoyé au fondateur. Il accepte ou refuse depuis son tableau.')
    } catch (err) {
      setDeletionError(err.message)
    } finally {
      setPendingDeletion(false)
    }
  }

  const tabClass = (id) =>
    `rounded-full px-4 py-2 text-sm ${pane === id ? 'bg-moss font-medium text-cream' : 'text-ink-soft'}`
  const modulesOn = MODULES.filter((item) => workspace.modules[item.id] && !(item.plan === 'pro' && !isPro))
  const modulesOff = MODULES.filter((item) => !workspace.modules[item.id] && !(item.plan === 'pro' && !isPro))
  const modulesLocked = MODULES.filter((item) => item.plan === 'pro' && !isPro)
  const showServices = Boolean(workspace.modules.appointments && !workspace.modules.page)
  const showDeposits = Boolean(workspace.modules.deposits)
  const showQuotes = Boolean(workspace.modules.quotes)

  return (
    <PageShell>
      <PageHeader
        kicker="Compte"
        title="Paramètres"
        description={
          pane === 'features'
            ? 'Ajoutez ou retirez une fonctionnalité. Celle qui est en place se règle dans l’onglet Paramètres.'
            : 'Uniquement ce que vous utilisez. Le reste se gère dans Fonctionnalités.'
        }
      />

      <div className="mt-6 flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-cream p-1 ring-1 ring-ink/6">
        <button type="button" onClick={() => setPane('settings')} className={tabClass('settings')}>
          Paramètres
        </button>
        <button type="button" onClick={() => setPane('features')} className={tabClass('features')}>
          Fonctionnalités
        </button>
      </div>

      {workspaceError ? (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{workspaceError}</p>
      ) : null}
      {workspaceOk ? <p className="mt-6 text-sm text-moss">{workspaceOk}</p> : null}

      {pane === 'features' ? (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="font-display text-2xl">Dans votre espace</h2>
            <p className="mt-1 text-sm text-ink-soft">Retirez ce dont vous n’avez plus besoin : le réglage quitte aussi l’onglet Paramètres.</p>
            {modulesOn.length ? (
              <ul className="mt-4 space-y-3">
                {modulesOn.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 rounded-[1.4rem] border border-ink/8 bg-cream px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">{item.hint}</p>
                      {item.settings ? (
                        <p className="mt-1 text-xs text-copper">Réglage : {item.settings}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={pendingWorkspace}
                      onClick={() => setModuleOn(item.id, false)}
                      className={ghostBtn}
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-[1.4rem] border border-dashed border-ink/12 bg-cream/50 px-5 py-8 text-sm text-ink-soft">
                Rien n’est activé pour l’instant. Ajoutez ce dont vous avez besoin ci-dessous.
              </p>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl">À ajouter</h2>
            <p className="mt-1 text-sm text-ink-soft">Une fois ajouté, ça apparaît dans le menu et, s’il y a un réglage, dans Paramètres.</p>
            {modulesOff.length ? (
              <ul className="mt-4 space-y-3">
                {modulesOff.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 rounded-[1.4rem] border border-ink/8 bg-cream/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">{item.hint}</p>
                      {item.settings ? (
                        <p className="mt-1 text-xs text-ink-soft">Débloquera : {item.settings}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={pendingWorkspace}
                      onClick={() => setModuleOn(item.id, true)}
                      className={primaryBtn}
                    >
                      Ajouter
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">Vous avez déjà tout ce qui est inclus dans votre offre.</p>
            )}
          </section>

          {modulesLocked.length ? (
            <section>
              <h2 className="font-display text-2xl">Nolyo Pro</h2>
              <p className="mt-1 text-sm text-ink-soft">Pour les ajouter, passez à Pro. Elles arriveront ensuite ici, à activer ou non.</p>
              <ul className="mt-4 space-y-3">
                {modulesLocked.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-[1.4rem] border border-ink/8 bg-cream/40 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">{item.hint}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink/6 px-2 py-1 text-[10px] font-semibold tracking-wide text-ink/50 uppercase">
                      {icons.lock}
                      Pro
                    </span>
                  </li>
                ))}
              </ul>
              <Link to="/dashboard/abonnement?upgrade=pro" className={`${primaryBtn} mt-5`}>
                Passer à Nolyo Pro
              </Link>
            </section>
          ) : null}
        </div>
      ) : (
      <div className="mt-8 space-y-3">
        <Accordion
          title="Votre espace"
          hint="Ce qui s’affiche en haut de l’espace."
          open={open.workspace}
          onToggle={() => toggle('workspace')}
        >
          <form onSubmit={saveWorkspace}>
            <p className="text-sm font-medium">Affiché en haut de l’espace</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              <li>
                <button
                  type="button"
                  onClick={() => setDisplayAs('company')}
                  className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
                    workspace.displayAs === 'company'
                      ? 'border-copper bg-cream shadow-sm ring-1 ring-copper/30'
                      : 'border-ink/10 bg-cream/60 hover:border-copper/40'
                  }`}
                >
                  <span className="block font-medium">Nom de l’activité</span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    {user.subscription?.company || user.business?.tradeName || 'Le nom renseigné à l’inscription'}
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setDisplayAs('person')}
                  className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
                    workspace.displayAs === 'person'
                      ? 'border-copper bg-cream shadow-sm ring-1 ring-copper/30'
                      : 'border-ink/10 bg-cream/60 hover:border-copper/40'
                  }`}
                >
                  <span className="block font-medium">Prénom et nom</span>
                  <span className="mt-1 block text-sm text-ink-soft">{user.name}</span>
                </button>
              </li>
            </ul>
            <button type="submit" disabled={pendingWorkspace} className={`${primaryBtn} mt-6`}>
              {pendingWorkspace ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        </Accordion>

        {showServices ? (
        <Accordion
          title="Prestations"
          hint="Nom, prix, durée. Elles servent dans l’agenda."
          open={open.services}
          onToggle={() => toggle('services')}
        >
          <ServicesEditor />
        </Accordion>
        ) : null}
        <Accordion
          title="Votre compte"
          hint="Nom, e-mail, photo affichée en bas de la barre."
          open={open.account}
          onToggle={() => toggle('account')}
        >
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar user={user} className="h-16 w-16 text-base" />
              <div>
                <label className={`${ghostBtn} cursor-pointer`}>
                  {pendingPhoto === 'avatar' ? 'Envoi…' : 'Choisir une photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      uploadAvatar(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                </label>
                {user.avatar ? (
                  <button type="button" className={`${quietBtn} mt-2 block`} onClick={removeAvatar}>
                    Retirer la photo
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-ink-soft">JPEG, PNG ou WebP · 3 Mo max.</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Nom
                <input className={fieldClass} name="name" value={profile.name} onChange={updateProfile} required />
              </label>
              <label className="block text-sm font-medium">
                E-mail
                <input
                  className={fieldClass}
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={updateProfile}
                  required
                />
              </label>
            </div>
            {profile.email !== user.email ? (
              <label className="block text-sm font-medium">
                Mot de passe actuel
                <input
                  className={fieldClass}
                  type="password"
                  name="currentPassword"
                  value={passwords.currentPassword}
                  onChange={updatePasswords}
                  autoComplete="current-password"
                  required
                />
              </label>
            ) : null}
            {profileError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{profileError}</p> : null}
            {profileOk ? <p className="text-sm text-moss">{profileOk}</p> : null}
            <button type="submit" disabled={pendingProfile} className={primaryBtn}>
              {pendingProfile ? 'Enregistrement…' : 'Enregistrer le compte'}
            </button>
          </form>
        </Accordion>

        <Accordion
          title="Votre entreprise"
          hint="Mentions pour devis et factures."
          open={open.business}
          onToggle={() => toggle('business')}
        >
          <form onSubmit={saveBusiness}>
            <h3 className="text-sm font-semibold tracking-wide text-copper uppercase">Identité</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Raison sociale
                <input className={fieldClass} name="legalName" value={business.legalName} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                Nom commercial
                <input className={fieldClass} name="tradeName" value={business.tradeName} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                Forme juridique
                <select className={fieldClass} name="legalForm" value={business.legalForm} onChange={updateBusiness}>
                  <option value="">Choisir</option>
                  {LEGAL_FORMS.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                SIRET
                <input className={fieldClass} name="siret" value={business.siret} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                N° TVA
                <input className={fieldClass} name="vatNumber" value={business.vatNumber} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                Code APE / NAF
                <input className={fieldClass} name="apeCode" value={business.apeCode} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                RCS / RM
                <input className={fieldClass} name="rcs" value={business.rcs} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                Capital social
                <input className={fieldClass} name="capital" value={business.capital} onChange={updateBusiness} />
              </label>
            </div>
            <h3 className="mt-8 text-sm font-semibold tracking-wide text-copper uppercase">Adresse</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">
                Adresse
                <input className={fieldClass} name="address" value={business.address} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium sm:col-span-2">
                Complément
                <input className={fieldClass} name="addressExtra" value={business.addressExtra} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                Code postal
                <input className={fieldClass} name="postalCode" value={business.postalCode} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                Ville
                <input className={fieldClass} name="city" value={business.city} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium sm:col-span-2">
                Pays
                <input className={fieldClass} name="country" value={business.country} onChange={updateBusiness} />
              </label>
            </div>
            <h3 className="mt-8 text-sm font-semibold tracking-wide text-copper uppercase">Contact</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Téléphone
                <input className={fieldClass} name="phone" value={business.phone} onChange={updateBusiness} />
              </label>
              <label className="block text-sm font-medium">
                Site web
                <input className={fieldClass} name="website" value={business.website} onChange={updateBusiness} />
              </label>
            </div>
            {businessError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{businessError}</p>
            ) : null}
            {businessOk ? <p className="mt-4 text-sm text-moss">{businessOk}</p> : null}
            <button type="submit" disabled={pendingBusiness} className={`${primaryBtn} mt-5`}>
              {pendingBusiness ? 'Enregistrement…' : 'Enregistrer l’entreprise'}
            </button>
          </form>
        </Accordion>

        {showDeposits ? (
        <Accordion
          title="Acomptes"
          hint="Votre répartition habituelle, 30/70 ou autre."
          open={open.deposits}
          onToggle={() => toggle('deposits')}
        >
          <form onSubmit={saveDeposits}>
            <DepositPlanEditor plan={depositPlan} onChange={setDepositPlan} />
            {depositError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{depositError}</p>
            ) : null}
            {depositOk ? <p className="mt-4 text-sm text-moss">{depositOk}</p> : null}
            <button type="submit" disabled={pendingDeposit} className={`${primaryBtn} mt-5`}>
              {pendingDeposit ? 'Enregistrement…' : 'Enregistrer les acomptes'}
            </button>
          </form>
        </Accordion>
        ) : null}

        {showQuotes ? (
        <Accordion
          title="Relances après devis"
          hint="Combien de jours après l’envoi, et par quel canal."
          open={open.followUp}
          onToggle={() => toggle('followUp')}
        >
          <form onSubmit={saveFollowUp} className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Délai
              <select
                className={fieldClass}
                value={followUp.quoteFollowUpDays}
                onChange={(event) =>
                  setFollowUp((current) => ({ ...current, quoteFollowUpDays: Number(event.target.value) }))
                }
              >
                <option value={-1}>Ne pas créer automatiquement</option>
                <option value={0}>Le jour même</option>
                <option value={1}>1 jour après</option>
                <option value={2}>2 jours après</option>
                <option value={3}>3 jours après</option>
                <option value={5}>5 jours après</option>
                <option value={7}>1 semaine après</option>
                <option value={14}>2 semaines après</option>
                <option value={21}>3 semaines après</option>
                <option value={30}>1 mois après</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Canal
              <select
                className={fieldClass}
                value={followUp.quoteFollowUpChannel}
                onChange={(event) =>
                  setFollowUp((current) => ({ ...current, quoteFollowUpChannel: event.target.value }))
                }
              >
                <option value="email">E-mail</option>
                <option value="phone">Téléphone</option>
                <option value="both">E-mail et téléphone</option>
              </select>
            </label>
            {followUpError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 sm:col-span-2">{followUpError}</p>
            ) : null}
            {followUpOk ? <p className="text-sm text-moss sm:col-span-2">{followUpOk}</p> : null}
            <div className="sm:col-span-2">
              <button type="submit" disabled={pendingFollowUp} className={primaryBtn}>
                {pendingFollowUp ? 'Enregistrement…' : 'Enregistrer les relances'}
              </button>
            </div>
          </form>
        </Accordion>
        ) : null}

        <Accordion
          title="Notifications"
          hint="E-mails de confirmation, rappels et notifications téléphone / ordinateur."
          open={open.notifications}
          onToggle={() => toggle('notifications')}
        >
          <form onSubmit={saveNotifications} className="space-y-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notif.emailBooking}
                onChange={(event) => setNotif((current) => ({ ...current, emailBooking: event.target.checked }))}
              />
              Recevoir un e-mail quand un rendez-vous est pris
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notif.pushBooking}
                onChange={(event) => setNotif((current) => ({ ...current, pushBooking: event.target.checked }))}
              />
              Notification push pour un nouveau rendez-vous
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notif.pushReminders}
                onChange={(event) => setNotif((current) => ({ ...current, pushReminders: event.target.checked }))}
              />
              Rappel avant le rendez-vous
            </label>
            <label className="block text-sm font-medium">
              Rappeler
              <select
                className={fieldClass}
                value={notif.reminderMinutes}
                onChange={(event) =>
                  setNotif((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))
                }
              >
                <option value={5}>5 minutes avant</option>
                <option value={10}>10 minutes avant</option>
                <option value={15}>15 minutes avant</option>
                <option value={30}>30 minutes avant</option>
                <option value={60}>1 heure avant</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notif.pushRelances}
                onChange={(event) => setNotif((current) => ({ ...current, pushRelances: event.target.checked }))}
              />
              Notifications pour les relances
            </label>

            <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">
              L’e-mail envoyé au client se personnalise dans{' '}
              <Link to="/dashboard/page" className="font-medium text-moss underline">
                Page → E-mail
              </Link>
              .
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={pushBusy} className={quietBtn} onClick={enablePush}>
                {pushBusy
                  ? 'Activation…'
                  : user.notifications?.pushEnabled
                    ? 'Réactiver sur cet appareil'
                    : 'Autoriser les notifications'}
              </button>
              <button type="submit" disabled={pendingNotif} className={primaryBtn}>
                {pendingNotif ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
            {notifError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{notifError}</p> : null}
            {notifOk ? <p className="text-sm text-moss">{notifOk}</p> : null}
          </form>
        </Accordion>

        <Accordion
          title="Mot de passe"
          hint="8 caractères min., une majuscule, un caractère spécial."
          open={open.password}
          onToggle={() => toggle('password')}
        >
          <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              Mot de passe actuel
              <input
                className={fieldClass}
                type="password"
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={updatePasswords}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Nouveau mot de passe
              <input
                className={fieldClass}
                type="password"
                name="newPassword"
                value={passwords.newPassword}
                onChange={updatePasswords}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Confirmation
              <input
                className={fieldClass}
                type="password"
                name="confirm"
                value={passwords.confirm}
                onChange={updatePasswords}
                autoComplete="new-password"
                required
              />
            </label>
            {passwordError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 sm:col-span-2">{passwordError}</p>
            ) : null}
            {passwordOk ? <p className="text-sm text-moss sm:col-span-2">{passwordOk}</p> : null}
            <div className="sm:col-span-2">
              <button type="submit" disabled={pendingPassword} className={primaryBtn}>
                {pendingPassword ? 'Enregistrement…' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </Accordion>

        <Accordion
          title="Session"
          hint="Déconnexion de cet appareil."
          open={open.session}
          onToggle={() => toggle('session')}
        >
          <button type="button" onClick={logout} className={primaryBtn}>
            Déconnexion
          </button>
        </Accordion>

        <Accordion
          id="settings-deletion"
          title="Supprimer le compte"
          hint="Un message au fondateur. Rien ne part sans son accord."
          open={open.deletion}
          onToggle={() => toggle('deletion')}
        >
          {deletion?.status === 'pending' ? (
            <div>
              <p className="text-sm text-ink-soft">Votre demande est chez le fondateur. Il accepte ou refuse.</p>
              <p className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm">{deletion.message}</p>
            </div>
          ) : (
            <form onSubmit={requestDeletion} className="space-y-4">
              {deletion?.status === 'refused' ? (
                <p className="rounded-2xl bg-paper px-4 py-3 text-sm">
                  Demande refusée
                  {deletion.refusalNote ? ` — ${deletion.refusalNote}` : '.'} Vous pouvez écrire à nouveau.
                </p>
              ) : (
                <p className="text-sm text-ink-soft">
                  Expliquez pourquoi vous partez. Le fondateur lit, puis accepte ou refuse.
                </p>
              )}
              <label className="block text-sm font-medium">
                Message
                <textarea
                  className={`${fieldClass} min-h-28 resize-y`}
                  value={deletionMessage}
                  onChange={(event) => setDeletionMessage(event.target.value)}
                  placeholder="Je souhaite fermer mon compte parce que…"
                  required
                  minLength={12}
                />
              </label>
              {deletionError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{deletionError}</p> : null}
              {deletionOk ? <p className="text-sm text-moss">{deletionOk}</p> : null}
              <button type="submit" disabled={pendingDeletion} className={primaryBtn}>
                {pendingDeletion ? 'Envoi…' : 'Envoyer au fondateur'}
              </button>
            </form>
          )}
        </Accordion>
      </div>
      )}
    </PageShell>
  )
}

export default Settings
