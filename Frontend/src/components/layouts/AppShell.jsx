import { useEffect } from 'react'

function MenuIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function MenuToggle({ open, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-cream text-ink lg:hidden ${className}`.trim()}
      aria-expanded={open}
      aria-controls="dash-mobile-nav"
      onClick={onClick}
    >
      <span className="sr-only">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
      <MenuIcon open={open} />
    </button>
  )
}

export function MobileDrawer({ open, onClose, title = 'Menu', children }) {
  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Fermer le menu" onClick={onClose} />
      <aside
        id="dash-mobile-nav"
        className="dash-sidebar absolute inset-y-0 left-0 flex w-[min(20.5rem,88vw)] max-w-full flex-col text-cream shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cream/50 uppercase">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-cream/10 text-cream"
            aria-label="Fermer"
          >
            <MenuIcon open />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </aside>
    </div>
  )
}

export function DashFrame({
  colsClass = 'lg:grid-cols-[17.5rem_minmax(0,1fr)]',
  sidebar,
  drawer,
  children,
  lockViewport = true,
}) {
  return (
    <div
      className={
        lockViewport
          ? `min-h-dvh bg-paper text-ink lg:grid lg:h-dvh lg:overflow-hidden ${colsClass}`
          : `min-h-dvh bg-paper text-ink lg:grid ${colsClass}`
      }
    >
      <aside
        className={
          lockViewport
            ? 'dash-sidebar hidden h-full min-h-0 flex-col text-cream lg:flex'
            : 'dash-sidebar hidden min-h-0 flex-col text-cream lg:sticky lg:top-0 lg:flex lg:h-dvh'
        }
      >
        {sidebar}
      </aside>
      {drawer}
      {children}
    </div>
  )
}
