import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal, ghostBtn, primaryBtn } from '../Pages/dashboard/ui'

const ToastContext = createContext(null)

const TONE = {
  success: {
    bar: 'bg-moss',
    chip: 'bg-moss/10 text-moss',
    label: 'OK',
  },
  error: {
    bar: 'bg-red-700',
    chip: 'bg-red-50 text-red-800',
    label: 'Erreur',
  },
  info: {
    bar: 'bg-ink',
    chip: 'bg-ink/5 text-ink-soft',
    label: 'Info',
  },
  pro: {
    bar: 'bg-copper',
    chip: 'bg-copper/10 text-copper',
    label: 'Pro',
  },
}

function ToastStack({ items, onDismiss }) {
  if (!items.length) return null
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-end gap-3 p-4 sm:p-6"
      aria-live="polite"
    >
      {items.map((item) => {
        const tone = TONE[item.tone] || TONE.info
        return (
          <div
            key={item.id}
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-[1.35rem] bg-paper shadow-2xl shadow-ink/20 ring-1 ring-ink/10 animate-[toast-in_0.35s_ease-out]"
            role="status"
          >
            <div className={`h-1 ${tone.bar}`} />
            <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${tone.chip}`}>
                {tone.label}
              </span>
              <div className="min-w-0 flex-1">
                {item.title ? <p className="font-medium text-ink">{item.title}</p> : null}
                {item.description ? (
                  <p className={`text-sm leading-relaxed text-ink-soft ${item.title ? 'mt-0.5' : ''}`}>
                    {item.description}
                  </p>
                ) : null}
                {item.action ? (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-copper transition hover:text-copper-dark"
                    onClick={() => {
                      item.action.onClick?.()
                      onDismiss(item.id)
                    }}
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full px-2 py-1 text-sm text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                onClick={() => onDismiss(item.id)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

function ConfirmDialog({ request, onResolve }) {
  if (!request) return null
  const dangerous = request.tone === 'danger'
  return (
    <Modal onClose={() => onResolve(false)} panelClassName="max-w-md" overlayClassName="z-[70]">
      {request.kicker ? (
        <p className="text-[11px] font-semibold tracking-[0.2em] text-copper uppercase">{request.kicker}</p>
      ) : null}
      <h2 className={`font-display text-2xl tracking-tight sm:text-3xl ${request.kicker ? 'mt-2' : ''}`}>
        {request.title}
      </h2>
      {request.description ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{request.description}</p>
      ) : null}
      {Array.isArray(request.bullets) && request.bullets.length ? (
        <ul className="mt-5 space-y-2.5 text-sm text-ink">
          {request.bullets.map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-copper" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-end gap-2">
        <button type="button" className={ghostBtn} onClick={() => onResolve(false)}>
          {request.cancelLabel || 'Annuler'}
        </button>
        <button
          type="button"
          className={`${primaryBtn} ${dangerous ? 'bg-red-700 hover:bg-red-800' : request.tone === 'pro' ? 'bg-copper hover:bg-copper-dark' : ''}`}
          onClick={() => onResolve(true)}
        >
          {request.confirmLabel || 'Confirmer'}
        </button>
      </div>
    </Modal>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmRequest, setConfirmRequest] = useState(null)
  const confirmResolver = useRef(null)
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    ({ title = '', description = '', tone = 'info', duration = 4500, action } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((current) => [...current.slice(-3), { id, title, description, tone, action }])
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration)
        timers.current.set(id, timer)
      }
      return id
    },
    [dismiss],
  )

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      if (confirmResolver.current) confirmResolver.current(false)
      confirmResolver.current = resolve
      setConfirmRequest({
        title: options.title || 'Confirmer',
        description: options.description || '',
        bullets: options.bullets,
        kicker: options.kicker,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        tone: options.tone || 'default',
      })
    })
  }, [])

  const resolveConfirm = useCallback((value) => {
    const resolve = confirmResolver.current
    confirmResolver.current = null
    setConfirmRequest(null)
    resolve?.(value)
  }, [])

  const value = useMemo(() => ({ toast, confirm, dismiss }), [toast, confirm, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack items={toasts} onDismiss={dismiss} />
      <ConfirmDialog request={confirmRequest} onResolve={resolveConfirm} />
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans ToastProvider')
  return ctx
}
