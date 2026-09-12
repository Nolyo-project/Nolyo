/**
 * Cadre live pour embarquer le vrai dashboard / la vraie page publique sur la landing.
 * pointer-events désactivés pour éviter de naviguer hors de la page d’accueil.
 *
 * variant="app"  → iframe en largeur desktop puis réduite (sidebar visible).
 * variant="page" → largeur réelle du cadre (page publique lisible, pas un hero géant).
 */
const DESKTOP_WIDTH = 1440

export default function LiveAppFrame({
  src,
  title,
  className = '',
  heightClass = 'h-[min(78svh,44rem)] sm:h-[min(84svh,56rem)]',
  variant = 'app',
  desktopWidth = DESKTOP_WIDTH,
}) {
  const isApp = variant === 'app'
  const href = src.includes('?') ? `${src}&embed=1` : `${src}?embed=1`

  return (
    <div
      className={`home-preview-frame overflow-hidden rounded-[1.5rem] bg-paper shadow-2xl shadow-ink/20 ring-1 ring-ink/10 ${className}`.trim()}
    >
      <div className="flex items-center gap-2 border-b border-ink/8 bg-cream px-3 py-2.5 sm:px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <p className="ml-2 truncate text-[11px] text-ink-soft sm:text-xs">{title}</p>
      </div>
      <div className={`relative w-full overflow-hidden bg-paper ${heightClass}`}>
        <iframe
          src={href}
          title={title}
          loading="lazy"
          tabIndex={-1}
          className={
            isApp
              ? 'home-preview-iframe pointer-events-none absolute top-0 left-0 h-full border-0'
              : 'pointer-events-none absolute inset-0 h-full w-full border-0'
          }
          style={
            isApp
              ? {
                  width: desktopWidth,
                  maxWidth: 'none',
                }
              : undefined
          }
        />
      </div>
    </div>
  )
}
