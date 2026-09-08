import { useEffect, useRef, useState } from 'react'

function composeLinks(email, subject, body) {
  const to = encodeURIComponent(email)
  const su = encodeURIComponent(subject || '')
  const text = encodeURIComponent(body || '')
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}${text ? `&body=${text}` : ''}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}${text ? `&body=${text}` : ''}`,
    app: `mailto:${email}?subject=${su}${text ? `&body=${text}` : ''}`,
  }
}

export function MailMenu({ email, name, subject, body, onPicked, className = '', triggerClassName = '', children }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const address = String(email || '').trim()

  useEffect(() => {
    if (!open) return undefined
    function hide(event) {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', hide)
    return () => document.removeEventListener('mousedown', hide)
  }, [open])

  if (!address) return children || null

  const title = subject || (name ? `Devis — ${name}` : 'Devis')
  const links = composeLinks(address, title, body)

  function pick(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpen(false)
    onPicked?.()
  }

  return (
    <span ref={root} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        className={
          triggerClassName ||
          'truncate text-left underline decoration-ink/20 underline-offset-2 transition hover:text-copper hover:decoration-copper'
        }
        onClick={(event) => {
          event.stopPropagation()
          event.preventDefault()
          setOpen((current) => !current)
        }}
      >
        {children || address}
      </button>
      {open ? (
        <span className="absolute top-full left-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl bg-paper p-2 shadow-xl ring-1 ring-ink/8">
          <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
            Envoyer à {address}
          </p>
          <button type="button" className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => pick(links.gmail)}>
            Ouvrir Gmail
          </button>
          <button type="button" className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => pick(links.outlook)}>
            Ouvrir Outlook
          </button>
          <button type="button" className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => pick(links.app)}>
            App mail de l’ordinateur
          </button>
        </span>
      ) : null}
    </span>
  )
}
