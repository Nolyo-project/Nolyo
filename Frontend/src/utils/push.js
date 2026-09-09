import { api } from '../api/client'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export async function ensurePushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Notifications non supportées sur cet appareil.')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Autorisez les notifications dans le navigateur.')
  }

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const { publicKey, enabled } = await api('/api/workspace/push/vapid-key')
  if (!enabled || !publicKey) {
    throw new Error('Les notifications push ne sont pas encore configurées (clés VAPID).')
  }

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const json = sub.toJSON()
  const data = await api('/api/workspace/push/subscribe', {
    method: 'POST',
    body: {
      endpoint: json.endpoint,
      keys: json.keys,
    },
  })
  return data.user
}
