/**
 * Cadre live pour embarquer le dashboard / la page publique sur la landing.
 * L’iframe prend la largeur du cadre : le contenu reste responsive, sans dézoom.
 */
export default function LiveAppFrame({
  src,
  title,
  className = '',
  heightClass = 'h-[28rem] sm:h-[36rem] lg:h-[min(78svh,46rem)]',
}) {
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
          className="pointer-events-none absolute inset-0 h-full w-full max-w-none border-0"
        />
      </div>
    </div>
  )
}
