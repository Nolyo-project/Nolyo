import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { formatPrice, isProPlan, planLabels, plans } from '../../data/plans'
import { fieldClass, normalizeDepositPlan, trialDaysLeft } from './format'
import { DepositPlanEditor } from './DepositPlanEditor'
import { PageHeader, PageShell, Surface, primaryBtn } from './ui'

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
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
  })
  const [business, setBusiness] = useState({ ...emptyBusiness, ...(user.business || {}) })
  const [depositPlan, setDepositPlan] = useState(() => normalizeDepositPlan(user.depositPlan))
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: '',
  })
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [businessError, setBusinessError] = useState('')
  const [profileOk, setProfileOk] = useState('')
  const [passwordOk, setPasswordOk] = useState('')
  const [businessOk, setBusinessOk] = useState('')
  const [depositError, setDepositError] = useState('')
  const [depositOk, setDepositOk] = useState('')
  const [pendingProfile, setPendingProfile] = useState(false)
  const [pendingPassword, setPendingPassword] = useState(false)
  const [pendingBusiness, setPendingBusiness] = useState(false)
  const [pendingDeposit, setPendingDeposit] = useState(false)

  const planId = user.subscription?.plan
  const plan = plans.find((item) => item.id === planId)
  const planName = planLabels[planId] || 'Nolio'
  const trialDays = trialDaysLeft(user.subscription?.activatedAt)

  useEffect(() => {
    setProfile({
      name: user.name,
      email: user.email,
    })
    setBusiness({ ...emptyBusiness, ...(user.business || {}) })
    setDepositPlan(normalizeDepositPlan(user.depositPlan))
  }, [user.name, user.email, user.business, user.depositPlan])

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
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: { business },
      })
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

  return (
    <PageShell>
      <PageHeader
        kicker="Compte"
        title="Paramètres"
        description="Les informations de votre entreprise, comme sur une fiche de facturation."
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
        <div className="space-y-6">
          <Surface as="form" onSubmit={saveBusiness} className="p-6">
            <h2 className="font-display text-2xl">Votre entreprise</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Ces mentions pourront figurer sur vos devis et factures.
            </p>

            <h3 className="mt-6 text-sm font-semibold tracking-wide text-copper uppercase">Identité</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Raison sociale
                <input
                  className={fieldClass}
                  name="legalName"
                  value={business.legalName}
                  onChange={updateBusiness}
                  placeholder="Nom légal"
                />
              </label>
              <label className="block text-sm font-medium">
                Nom commercial
                <input
                  className={fieldClass}
                  name="tradeName"
                  value={business.tradeName}
                  onChange={updateBusiness}
                  placeholder="Celui affiché dans Nolio"
                />
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
                <input
                  className={fieldClass}
                  name="siret"
                  value={business.siret}
                  onChange={updateBusiness}
                  placeholder="14 chiffres"
                />
              </label>
              <label className="block text-sm font-medium">
                N° TVA
                <input
                  className={fieldClass}
                  name="vatNumber"
                  value={business.vatNumber}
                  onChange={updateBusiness}
                  placeholder="FR…"
                />
              </label>
              <label className="block text-sm font-medium">
                Code APE / NAF
                <input
                  className={fieldClass}
                  name="apeCode"
                  value={business.apeCode}
                  onChange={updateBusiness}
                  placeholder="74.10Z"
                />
              </label>
              <label className="block text-sm font-medium">
                RCS / RM
                <input
                  className={fieldClass}
                  name="rcs"
                  value={business.rcs}
                  onChange={updateBusiness}
                  placeholder="RCS Lyon…"
                />
              </label>
              <label className="block text-sm font-medium">
                Capital social
                <input
                  className={fieldClass}
                  name="capital"
                  value={business.capital}
                  onChange={updateBusiness}
                  placeholder="1 000 €"
                />
              </label>
            </div>

            <h3 className="mt-8 text-sm font-semibold tracking-wide text-copper uppercase">Adresse</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">
                Adresse
                <input
                  className={fieldClass}
                  name="address"
                  value={business.address}
                  onChange={updateBusiness}
                />
              </label>
              <label className="block text-sm font-medium sm:col-span-2">
                Complément
                <input
                  className={fieldClass}
                  name="addressExtra"
                  value={business.addressExtra}
                  onChange={updateBusiness}
                  placeholder="Bâtiment, étage…"
                />
              </label>
              <label className="block text-sm font-medium">
                Code postal
                <input
                  className={fieldClass}
                  name="postalCode"
                  value={business.postalCode}
                  onChange={updateBusiness}
                />
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
                <input
                  className={fieldClass}
                  name="website"
                  value={business.website}
                  onChange={updateBusiness}
                  placeholder="https://"
                />
              </label>
            </div>

            <h3 className="mt-8 text-sm font-semibold tracking-wide text-copper uppercase">Coordonnées bancaires</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                IBAN
                <input
                  className={fieldClass}
                  name="iban"
                  value={business.iban}
                  onChange={updateBusiness}
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm font-medium">
                BIC
                <input
                  className={fieldClass}
                  name="bic"
                  value={business.bic}
                  onChange={updateBusiness}
                  autoComplete="off"
                />
              </label>
            </div>

            {businessError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{businessError}</p>
            ) : null}
            {businessOk ? <p className="mt-4 text-sm text-moss">{businessOk}</p> : null}
            <button type="submit" disabled={pendingBusiness} className={`${primaryBtn} mt-5`}>
              {pendingBusiness ? 'Enregistrement…' : 'Enregistrer l’entreprise'}
            </button>
          </Surface>

          <Surface as="form" onSubmit={saveDeposits} className="p-6">
            <h2 className="font-display text-2xl">Acomptes</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Votre répartition habituelle. Un photographe met souvent 50 / 50, un site 30 / 40 / 30. Les libellés
              sont à vous.
            </p>
            <div className="mt-5">
              <DepositPlanEditor plan={depositPlan} onChange={setDepositPlan} />
            </div>
            {depositError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{depositError}</p>
            ) : null}
            {depositOk ? <p className="mt-4 text-sm text-moss">{depositOk}</p> : null}
            <button type="submit" disabled={pendingDeposit} className={`${primaryBtn} mt-5`}>
              {pendingDeposit ? 'Enregistrement…' : 'Enregistrer les acomptes'}
            </button>
          </Surface>

          <Surface as="form" onSubmit={saveProfile} className="p-6">
            <h2 className="font-display text-2xl">Votre compte</h2>
            <p className="mt-1 text-sm text-ink-soft">Le nom affiché dans la barre latérale, et l’e-mail de connexion.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
              <label className="mt-4 block text-sm font-medium">
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
                <span className="mt-1 block text-xs font-normal text-ink-soft">
                  Nécessaire pour confirmer le changement d’e-mail.
                </span>
              </label>
            ) : null}
            {profileError ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{profileError}</p> : null}
            {profileOk ? <p className="mt-4 text-sm text-moss">{profileOk}</p> : null}
            <button type="submit" disabled={pendingProfile} className={`${primaryBtn} mt-5`}>
              {pendingProfile ? 'Enregistrement…' : 'Enregistrer le compte'}
            </button>
          </Surface>

          <Surface as="form" onSubmit={savePassword} className="p-6">
            <h2 className="font-display text-2xl">Mot de passe</h2>
            <p className="mt-1 text-sm text-ink-soft">Au moins 8 caractères.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
            </div>
            {passwordError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{passwordError}</p>
            ) : null}
            {passwordOk ? <p className="mt-4 text-sm text-moss">{passwordOk}</p> : null}
            <button type="submit" disabled={pendingPassword} className={`${primaryBtn} mt-5`}>
              {pendingPassword ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>
          </Surface>
        </div>

        <div className="space-y-6">
          <Surface className="p-6">
            <h2 className="font-display text-2xl">Abonnement</h2>
            <p className="mt-3 text-sm font-medium">{planName}</p>
            {plan ? (
              <p className="mt-1 text-sm text-ink-soft">
                {formatPrice(plan.price)} / {plan.period}
              </p>
            ) : null}
            <p className="mt-4 text-sm text-ink-soft">
              {trialDays > 0
                ? `${trialDays} jour${trialDays > 1 ? 's' : ''} restant${trialDays > 1 ? 's' : ''} de la période gratuite.`
                : 'Période gratuite terminée.'}
            </p>
            {user.subscription?.company ? (
              <p className="mt-3 text-sm text-ink-soft">{user.subscription.company}</p>
            ) : null}
            {isProPlan(user) ? (
              <p className="mt-4 text-sm text-moss">Vous avez tout Nolio.</p>
            ) : (
              <>
                <p className="mt-4 text-sm text-ink-soft">
                  Inbox et statistiques restent verrouillées sur l’Essentiel.
                </p>
                <Link to="/abonnement?plan=pro" className={`${primaryBtn} mt-5`}>
                  Passer à Nolio Pro
                </Link>
              </>
            )}
          </Surface>

          <Surface className="p-6">
            <h2 className="font-display text-2xl">Session</h2>
            <p className="mt-1 text-sm text-ink-soft">Déconnectez-vous de cet appareil.</p>
            <button type="button" onClick={logout} className={`${primaryBtn} mt-5`}>
              Déconnexion
            </button>
          </Surface>
        </div>
      </div>
    </PageShell>
  )
}

export default Settings
