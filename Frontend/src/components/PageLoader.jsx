import nolioLogo from '../assets/nolio-logo.png'

function PageLoader() {
  return (
    <div className="grid min-h-svh place-items-center bg-paper text-ink">
      <div className="flex flex-col items-center gap-3">
        <img src={nolioLogo} alt="Nolio" className="h-9 w-auto animate-pulse" />
        <p className="text-sm text-ink-soft">Chargement…</p>
      </div>
    </div>
  )
}

export default PageLoader
