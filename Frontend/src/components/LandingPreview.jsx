function Shot({ src, alt }) {
  return (
    <figure className="overflow-hidden rounded-2xl bg-cream shadow-2xl shadow-ink/15 ring-1 ring-ink/10 sm:rounded-[1.5rem]">
      <img src={src} alt={alt} className="block h-auto w-full" />
    </figure>
  )
}

export function LandingDashPreview() {
  return (
    <Shot
      src="/previews/dashboard.png"
      alt="Tableau de bord Nolyo — Maison Brume"
    />
  )
}

export function LandingPagePreview() {
  return (
    <Shot
      src="/previews/page-pro.jpg"
      alt="Page professionnelle Maison Brume — Inès Daroux"
    />
  )
}
