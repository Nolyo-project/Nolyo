import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProPlan } from '../../data/plans'
import { formatDateTime } from './format'
import { UpgradeWall } from './UpgradeWall'
import { EmptyState, PageHeader, PageShell, Surface, initials, quietBtn } from './ui'

const INSTAGRAM_GRADIENT = 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 48%, #6228d7 100%)'

const networks = {
  instagram: {
    key: 'instagram',
    label: 'Instagram',
    accentStyle: { background: INSTAGRAM_GRADIENT },
    avatarStyle: { background: INSTAGRAM_GRADIENT, color: '#fff' },
    chipStyle: { background: INSTAGRAM_GRADIENT, color: '#fff' },
    tagStyle: { background: 'rgba(238, 42, 123, 0.12)', color: '#c13584' },
  },
  facebook: {
    key: 'facebook',
    label: 'Facebook',
    accentStyle: { background: '#1877F2' },
    avatarStyle: { background: '#1877F2', color: '#fff' },
    chipStyle: { background: '#1877F2', color: '#fff' },
    tagStyle: { background: 'rgba(24, 119, 242, 0.12)', color: '#1877F2' },
  },
  gmail: {
    key: 'gmail',
    label: 'Gmail',
    accentStyle: { background: '#EA4335' },
    avatarStyle: { background: '#EA4335', color: '#fff' },
    chipStyle: { background: '#EA4335', color: '#fff' },
    tagStyle: { background: 'rgba(234, 67, 53, 0.12)', color: '#EA4335' },
  },
  outlook: {
    key: 'outlook',
    label: 'Outlook',
    accentStyle: { background: '#0078D4' },
    avatarStyle: { background: '#0078D4', color: '#fff' },
    chipStyle: { background: '#0078D4', color: '#fff' },
    tagStyle: { background: 'rgba(0, 120, 212, 0.12)', color: '#0078D4' },
  },
  yahoo: {
    key: 'yahoo',
    label: 'Yahoo',
    accentStyle: { background: '#6001D2' },
    avatarStyle: { background: '#6001D2', color: '#fff' },
    chipStyle: { background: '#6001D2', color: '#fff' },
    tagStyle: { background: 'rgba(96, 1, 210, 0.12)', color: '#6001D2' },
  },
  icloud: {
    key: 'icloud',
    label: 'iCloud',
    accentStyle: { background: '#3693F3' },
    avatarStyle: { background: '#3693F3', color: '#fff' },
    chipStyle: { background: '#3693F3', color: '#fff' },
    tagStyle: { background: 'rgba(54, 147, 243, 0.12)', color: '#0b84fe' },
  },
  proton: {
    key: 'proton',
    label: 'Proton',
    accentStyle: { background: '#6D4AFF' },
    avatarStyle: { background: '#6D4AFF', color: '#fff' },
    chipStyle: { background: '#6D4AFF', color: '#fff' },
    tagStyle: { background: 'rgba(109, 74, 255, 0.12)', color: '#6D4AFF' },
  },
}

function mailboxFromEmail(email) {
  const domain = String(email || '')
    .split('@')[1]
    ?.toLowerCase()
    .replace(/^mail\./, '')
  if (!domain) return 'gmail'
  if (['gmail.com', 'googlemail.com'].includes(domain)) return 'gmail'
  if (
    ['outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com'].includes(domain) ||
    domain.endsWith('.onmicrosoft.com')
  ) {
    return 'outlook'
  }
  if (['yahoo.com', 'yahoo.fr', 'ymail.com'].includes(domain)) return 'yahoo'
  if (['icloud.com', 'me.com', 'mac.com'].includes(domain)) return 'icloud'
  if (['proton.me', 'protonmail.com'].includes(domain)) return 'proton'
  return 'gmail'
}

function appearanceFor(item, userEmail) {
  if (item.source === 'instagram') return networks.instagram
  if (item.source === 'facebook') return networks.facebook
  return networks[mailboxFromEmail(item.from || userEmail)] || networks.gmail
}

function sourceIcon(kind) {
  if (kind === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" />
      </svg>
    )
  }
  if (kind === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
        <path
          d="M14.5 8.5H16V5.8C15.5 5.7 14.6 5.5 13.6 5.5c-2.2 0-3.6 1.4-3.6 3.8V12H8v2.8h2v6.7h3.2v-6.7h2.4l.4-2.8h-2.8V9.5c0-.8.2-1 1.3-1z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function senderInitials(from) {
  const clean = String(from || '')
    .replace(/^@/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/@.*$/, ' ')
  return initials(clean) || '?'
}

function timeAgo(value) {
  const date = new Date(value)
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'À l’instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Il y a ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 7) return `Il y a ${days} j`
  return formatDateTime(value)
}

function Inbox() {
  const { user } = useAuth()
  const isPro = isProPlan(user)
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('unread')
  const [folder, setFolder] = useState('all')
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState('')

  useEffect(() => {
    if (!isPro) return
    api('/api/workspace/inbox')
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
  }, [isPro])

  const unread = useMemo(() => items.filter((item) => !item.read), [items])

  function folderOf(item) {
    if (item.source === 'instagram' || item.source === 'facebook') return item.source
    return 'email'
  }

  const folders = useMemo(() => {
    const emailUnread = items.filter((item) => folderOf(item) === 'email' && !item.read).length
    const instaUnread = items.filter((item) => folderOf(item) === 'instagram' && !item.read).length
    const fbUnread = items.filter((item) => folderOf(item) === 'facebook' && !item.read).length
    return [
      { key: 'all', label: 'Tous', count: unread.length, total: items.length },
      { key: 'instagram', label: 'Instagram', count: instaUnread, total: items.filter((item) => folderOf(item) === 'instagram').length },
      { key: 'facebook', label: 'Facebook', count: fbUnread, total: items.filter((item) => folderOf(item) === 'facebook').length },
      { key: 'email', label: 'E-mail', count: emailUnread, total: items.filter((item) => folderOf(item) === 'email').length },
    ]
  }, [items, unread.length])

  const inFolder = useMemo(
    () => (folder === 'all' ? items : items.filter((item) => folderOf(item) === folder)),
    [folder, items],
  )
  const folderUnread = inFolder.filter((item) => !item.read)
  const folderRead = inFolder.filter((item) => item.read)
  const visible = tab === 'read' ? folderRead : folderUnread

  async function setRead(item, nextRead) {
    if (pendingId) return
    setError('')
    setPendingId(item._id)
    setItems((current) => current.map((row) => (row._id === item._id ? { ...row, read: nextRead } : row)))
    try {
      const data = await api(`/api/workspace/inbox/${item._id}`, {
        method: 'PATCH',
        body: { read: nextRead },
      })
      setItems((current) => current.map((row) => (row._id === item._id ? data.item : row)))
      window.dispatchEvent(new Event('nolio-workspace-changed'))
    } catch (err) {
      setItems((current) => current.map((row) => (row._id === item._id ? item : row)))
      setError(err.message)
    } finally {
      setPendingId('')
    }
  }

  const mailbox = networks[mailboxFromEmail(user.email)] || networks.gmail
  const connected = [networks.instagram, networks.facebook, mailbox]

  if (!isPro) {
    return (
      <UpgradeWall
        title="Boîte de réception"
        icon="inbox"
        description="Instagram, Facebook et e-mail, au même endroit. Sur l’Essentiel, cette vue reste verrouillée."
        highlights={[
          'Messages Instagram, Facebook et e-mail réunis',
          'Une file unique, sans changer d’onglet',
          'Plusieurs connexions sur le même espace',
        ]}
      />
    )
  }

  const emptyMessage =
    tab === 'read'
      ? 'Aucun message lu dans ce dossier.'
      : folderUnread.length === 0 && inFolder.length > 0
        ? 'Tout est lu dans ce dossier.'
        : folder === 'all'
          ? 'Aucun message pour le moment.'
          : 'Ce dossier est vide pour l’instant.'

  return (
    <PageShell>
      <PageHeader
        kicker="Pro"
        title="Boîte de réception"
        description="Instagram, Facebook et e-mail, chacun dans son dossier. Un message lu passe dans Lus."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {connected.map((meta) => (
          <span
            key={meta.key}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={meta.chipStyle}
          >
            {sourceIcon(meta.key)}
            {meta.label} connecté
          </span>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className="space-y-1">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Dossiers</p>
          {folders.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFolder(item.key)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                folder === item.key ? 'bg-moss font-medium text-cream' : 'bg-cream text-ink hover:bg-paper'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {item.key === 'all' ? null : sourceIcon(item.key)}
                {item.label}
              </span>
              <span className={folder === item.key ? 'text-cream/70' : 'text-ink-soft'}>
                {item.count ? item.count : item.total || ''}
              </span>
            </button>
          ))}
        </nav>

        <div>
      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-cream p-1 ring-1 ring-ink/6">
        <button
          type="button"
          onClick={() => setTab('unread')}
          className={`rounded-full px-4 py-2 text-sm ${
            tab === 'unread' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
          }`}
        >
          Non lus ({folderUnread.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('read')}
          className={`rounded-full px-4 py-2 text-sm ${
            tab === 'read' ? 'bg-moss font-medium text-cream' : 'text-ink-soft'
          }`}
        >
          Lus ({folderRead.length})
        </button>
      </div>

      {error ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      {visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState>{emptyMessage}</EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {visible.map((item) => {
            const meta = appearanceFor(item, user.email)
            const busy = pendingId === item._id
            return (
              <li key={item._id}>
                <Surface
                  as={item.read ? 'div' : 'button'}
                  type={item.read ? undefined : 'button'}
                  disabled={item.read ? undefined : busy}
                  onClick={item.read ? undefined : () => setRead(item, true)}
                  className={`relative w-full overflow-hidden p-0 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    item.read ? '' : 'cursor-pointer ring-copper/25'
                  }`}
                >
                  <span className="absolute inset-y-0 left-0 w-1.5" style={meta.accentStyle} aria-hidden />
                  <div className="flex items-stretch gap-4 py-5 pr-5 pl-6 sm:gap-5 sm:pr-6">
                    <span
                      className="mt-0.5 grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-semibold"
                      style={meta.avatarStyle}
                    >
                      {senderInitials(item.from)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
                          style={meta.tagStyle}
                        >
                          {sourceIcon(meta.key)}
                          {meta.label}
                        </span>
                        {item.read ? null : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-copper uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-copper" aria-hidden />
                            Non lu
                          </span>
                        )}
                        <span className="ml-auto text-xs text-ink-soft">{timeAgo(item.receivedAt)}</span>
                      </div>
                      <p className={`mt-2 truncate text-base ${item.read ? 'font-medium text-ink' : 'font-semibold'}`}>
                        {item.from}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">{item.preview}</p>
                      {item.read ? (
                        <button
                          type="button"
                          disabled={busy}
                          className={`${quietBtn} mt-3`}
                          onClick={() => setRead(item, false)}
                        >
                          Remettre en non lu
                        </button>
                      ) : (
                        <p className="mt-3 text-xs font-semibold text-copper">
                          {busy ? 'Envoi…' : 'Cliquer pour marquer comme lu'}
                        </p>
                      )}
                    </div>
                  </div>
                </Surface>
              </li>
            )
          })}
        </ul>
      )}
        </div>
      </div>
    </PageShell>
  )
}

export default Inbox
