import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  acceptAllConsent,
  getConsent,
  onConsentChange,
  onConsentOpen,
  refuseOptionalConsent,
} from '../utils/consent'
import { disableGoogleScripts, initGoogleAnalytics } from '../utils/analytics'
import { isAdminHost } from '../config/site'

function applyConsent(consent) {
  if (consent?.analytics || consent?.ads) initGoogleAnalytics()
  else disableGoogleScripts()
}

function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isAdminHost()) return undefined
    const current = getConsent()
    if (!current) setVisible(true)
    else applyConsent(current)

    const offChange = onConsentChange((next) => {
      applyConsent(next)
      setVisible(false)
    })
    const offOpen = onConsentOpen(() => setVisible(true))
    return () => {
      offChange()
      offOpen()
    }
  }, [])

  if (isAdminHost() || !visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-80 p-3 sm:p-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-[1.4rem] bg-cream p-4 shadow-2xl ring-1 ring-ink/10 sm:p-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Cookies</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            Nolyo utilise des cookies techniques pour fonctionner. Avec votre accord, nous mesurons aussi le trafic
            (Google Analytics) et les campagnes (Google Ads), sans jamais envoyer d’e-mail à Google.{' '}
            <Link to="/politique-confidentialite" className="font-semibold underline decoration-copper/40">
              Politique de confidentialité
            </Link>
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => refuseOptionalConsent()}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-ink/12 transition hover:bg-ink/4"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => acceptAllConsent()}
            className="rounded-full bg-moss px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-ink"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConsentBanner
