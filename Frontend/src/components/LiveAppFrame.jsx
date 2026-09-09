/**
 * Cadre live pour embarquer le vrai dashboard / la vraie page publique sur la landing.
 * pointer-events désactivés pour éviter de naviguer hors de la page d’accueil.
 */
export default function LiveAppFrame({
  src,
  title,
  className = '',
  aspectClass = 'aspect-[16/11]',
  scale = 0.72,
}) {
  const pct = `${(100 / scale).toFixed(2)}%`
  return (
    <div
      className={`overflow-hidden rounded-[1.5rem] bg-paper shadow-2xl shadow-ink/15 ring-1 ring-ink/10 ${className}`.trim()}
    >
      <div className="flex items-center gap-2 border-b border-ink/8 bg-cream px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <p className="ml-2 truncate text-[11px] text-ink-soft">{title}</p>
      </div>
      <div className={`relative w-full overflow-hidden bg-paper ${aspectClass}`}>
        <iframe
          src={src}
          title={title}
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none absolute top-0 left-0 border-0"
          style={{
            width: pct,
            height: pct,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  )
}
