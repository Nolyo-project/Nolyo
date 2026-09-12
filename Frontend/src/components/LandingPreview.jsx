import accueil from '../assets/accueil.png'
import pagePro from '../assets/page.png'

function LaptopMockup({ src, alt }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-[1.15rem] bg-ink p-1.5 shadow-2xl shadow-ink/25 sm:rounded-[1.4rem] sm:p-2.5">
        <div className="relative overflow-hidden rounded-[0.9rem] bg-paper sm:rounded-[1.1rem]">
          <div className="flex items-center justify-center bg-ink py-1.5 sm:py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cream/25 sm:h-2 sm:w-2" />
          </div>
          <img src={src} alt={alt} className="block h-auto w-full" />
        </div>
      </div>
      <div className="mx-auto h-2 w-[36%] rounded-b-full bg-ink/80 sm:h-2.5" />
      <div className="mx-auto h-1.5 w-[50%] rounded-b-2xl bg-ink/35 sm:h-2" />
    </div>
  )
}

export function LandingDashPreview() {
  return <LaptopMockup src={accueil} alt="Tableau de bord Nolyo — Maison Brume" />
}

export function LandingPagePreview() {
  return <LaptopMockup src={pagePro} alt="Page professionnelle Maison Brume — Inès Daroux" />
}
