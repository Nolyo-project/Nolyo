import { useEffect } from 'react'

export function PageShell({ children, className = '' }) {
  return <main className={`w-full px-5 py-8 lg:px-10 lg:py-10 ${className}`.trim()}>{children}</main>
}

export function Modal({ onClose, children, panelClassName = '', overlayClassName = '' }) {
  useEffect(() => {
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
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8 ${overlayClassName || 'z-50'}`.trim()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        className={`my-auto w-full rounded-[1.6rem] bg-paper p-6 shadow-2xl sm:p-8 ${panelClassName}`.trim()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function PageHeader({ kicker, title, description, actions }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {kicker ? (
          <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">{kicker}</p>
        ) : null}
        <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Surface({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`rounded-[1.5rem] bg-cream shadow-sm shadow-ink/5 ring-1 ring-ink/6 ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function EmptyState({ children }) {
  return (
    <div className="flex flex-col items-center rounded-[1.5rem] border border-dashed border-ink/12 bg-cream/40 px-5 py-14 text-center text-sm text-ink-soft">
      {children}
    </div>
  )
}

export function Accordion({ id, title, hint, open, onToggle, children }) {
  return (
    <Surface id={id} className="overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block font-display text-2xl">{title}</span>
          {hint ? <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span> : null}
        </span>
        <span className={`shrink-0 text-lg text-ink-soft transition ${open ? 'rotate-180' : ''}`} aria-hidden>
          ⌄
        </span>
      </button>
      {open ? <div className="border-t border-ink/6 px-6 pt-5 pb-6">{children}</div> : null}
    </Surface>
  )
}

export const primaryBtn =
  'inline-flex items-center justify-center rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-ink disabled:opacity-60'
export const ghostBtn =
  'inline-flex items-center justify-center rounded-full border border-ink/10 bg-cream px-4 py-2 text-sm transition hover:border-ink/20 hover:bg-paper'
export const quietBtn = 'text-xs font-medium text-ink-soft transition hover:text-copper'

function Icon({ children, className = 'h-[18px] w-[18px]' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {children}
    </svg>
  )
}

export const icons = {
  home: (
    <Icon>
      <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </Icon>
  ),
  people: (
    <Icon>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 19c.6-2.8 2.6-4.5 5-4.5s4.4 1.7 5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16.2 14.6c1.8.4 3.2 1.8 3.8 4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  calendar: (
    <Icon>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  absence: (
    <Icon>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 14.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  note: (
    <Icon>
      <path d="M7 4.5h7.5L20 10v9.5a1 1 0 01-1 1H7a1 1 0 01-1-1v-14a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14.5 4.5V10H20M9 14h6M9 17.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  wallet: (
    <Icon>
      <rect x="3.5" y="6" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 10h17M16.5 14.5h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  card: (
    <Icon>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 10h18M7 15h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  bell: (
    <Icon>
      <path d="M12 4.5a5 5 0 015 5c0 4 1.5 5.5 1.5 5.5H5.5S7 13.5 7 9.5a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  inbox: (
    <Icon>
      <path d="M4 13.5l2.4-7.2A2 2 0 018.3 5h7.4a2 2 0 011.9 1.3L20 13.5V18a1 1 0 01-1 1H5a1 1 0 01-1-1v-4.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 13.5h4.2a2 2 0 001.8 1.1h4a2 2 0 001.8-1.1H20" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </Icon>
  ),
  search: (
    <Icon className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  prospect: (
    <Icon>
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 19c.7-3 3-4.8 6-4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 14v6M13 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  journal: (
    <Icon>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 12.2l2.4 2.3L16.2 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  ),
  chart: (
    <Icon>
      <path d="M4 19h16M7 16v-5M12 16V8M17 16V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  lock: (
    <Icon className="h-3.5 w-3.5">
      <rect x="7" y="11" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 11V8.5a3 3 0 016 0V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  qr: (
    <Icon>
      <path d="M5 5h5.5v5.5H5V5zM13.5 5H19v5.5h-5.5V5zM5 13.5H10.5V19H5v-5.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13.5 13.5h2.2V16M16 19h3v-3M19 13.5h-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
  page: (
    <Icon>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 9h8M8 12.5h5.5M8 16h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  ),
}

export function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function Avatar({ user, className = 'h-10 w-10', light = false }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full text-xs font-semibold ${
        light ? 'bg-cream/12 text-cream' : 'bg-moss text-cream'
      } ${className}`}
    >
      {initials(user?.company || user?.name)}
    </span>
  )
}
