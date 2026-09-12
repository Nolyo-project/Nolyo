import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { hasModule } from '../../data/workspace'
import { PageHeader, PageShell } from './ui'
import { UpgradeWall } from './UpgradeWall'
import { PageStudio } from './PageStudio'

function Page() {
  const { user } = useAuth()
  const isPro = isProPlan(user)

  if (!isPro) {
    return (
      <UpgradeWall
        title="Votre page, en ligne"
        description="La vitrine, la réservation et le QR Code font partie de Nolyo Pro. Vos clients vous trouvent, et prennent rendez-vous."
        icon="page"
        highlights={[
          'Page d’accueil et à propos',
          'Réalisations, couleurs, contact',
          'Réservation en ligne',
        ]}
      />
    )
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Vitrine"
        title="Page"
        description="Portrait, réalisations, horaires, prestations — enregistrés ici, visibles par vos visiteurs."
      />
      <PageStudio isPro={isPro} showQr={hasModule(user, 'qr')} />
    </PageShell>
  )
}

export default Page
