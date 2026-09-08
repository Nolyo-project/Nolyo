import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { ghostBtn, PageHeader, PageShell, primaryBtn, Surface } from './ui'
import { UpgradeWall } from './UpgradeWall'

function qrImageUrl(value) {
  const params = new URLSearchParams({
    size: '640x640',
    ecc: 'M',
    color: '243026',
    bgcolor: 'faf7f1',
    data: value,
  })
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
}

function QrCodePage() {
  const { user } = useAuth()
  if (!isProPlan(user)) {
    return (
      <UpgradeWall
        title="Votre page, en un scan"
        description="Le QR Code et la page professionnelle font partie de Nolyo Pro. Vos clients ouvrent votre vitrine et réservent en ligne."
        icon="qr"
        highlights={[
          'Page professionnelle à votre nom',
          'Réservation en ligne',
          'QR Code pour la vitrine et les cartes',
        ]}
      />
    )
  }
  return <QrCodeContent user={user} />
}

function QrCodeContent({ user }) {
  const slug = user?.page?.slug || ''
  const published = Boolean(user?.page?.published && slug)
  const url = slug ? `${window.location.origin}/p/${slug}` : ''
  const imageUrl = useMemo(() => (url ? qrImageUrl(url) : ''), [url])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function copyLink() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function download() {
    if (!imageUrl || !slug) return
    setError('')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `nolyo-${slug}.png`
      link.click()
    }
    img.onerror = () => setError('Le téléchargement du QR Code a échoué. Réessayez.')
    img.src = imageUrl
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Présence"
        title="QR Code"
        description="Un code à poser en vitrine, sur une carte ou un flyer. Il ouvre votre page professionnelle, avec la réservation en ligne."
      />

      {!slug ? (
        <Surface className="mt-8 p-8">
          <p className="font-display text-2xl">Choisissez d’abord un lien.</p>
          <p className="mt-2 text-sm text-ink-soft">Le QR Code reprend l’adresse de votre page de présentation.</p>
          <Link to="/dashboard/page" className={`${primaryBtn} mt-6`}>
            Ouvrir la page
          </Link>
        </Surface>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <Surface className="grid place-items-center p-8">
            <img src={imageUrl} alt="QR Code de la page professionnelle" className="w-full max-w-64 rounded-2xl bg-cream" />
          </Surface>
          <Surface className="p-8">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-copper uppercase">Votre lien</p>
            <p className="mt-3 break-all font-medium">{url}</p>
            {!published ? (
              <p className="mt-3 text-sm text-ink-soft">
                Publiez la page pour que le lien s’ouvre vraiment.
              </p>
            ) : null}
            {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={download} className={primaryBtn}>
                Télécharger
              </button>
              <button type="button" onClick={copyLink} className={ghostBtn}>
                {copied ? 'Lien copié' : 'Copier le lien'}
              </button>
              <a href={url} target="_blank" rel="noreferrer" className={ghostBtn}>
                Voir la page
              </a>
            </div>
          </Surface>
        </div>
      )}
    </PageShell>
  )
}

export default QrCodePage
