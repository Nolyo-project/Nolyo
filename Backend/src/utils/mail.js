const emailjs = require('@emailjs/nodejs')
const { publicOrigin } = require('./site')

const SIGNATURE = {
  phone: '+33769971007',
  phoneDisplay: '+33 7 69 97 10 07',
  email: 'support.nolyo@gmail.com',
  site: 'nolyo.fr',
}

function mailEnabled() {
  return Boolean(
    process.env.EMAILJS_SERVICE_ID &&
      process.env.EMAILJS_TEMPLATE_ID &&
      process.env.EMAILJS_PUBLIC_KEY,
  )
}

function signatureText() {
  return `

—
NOLYO
${SIGNATURE.phoneDisplay} | ${SIGNATURE.email} | ${SIGNATURE.site}`
}

/**
 * Signature HTML (sans image) — fiable sur Gmail / iPhone / Outlook.
 * Les images hébergées cassent souvent sur mobile (icône « ? »).
 */
function signatureHtml() {
  const siteHref = publicOrigin() || `https://${SIGNATURE.site}`
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:36px;border-top:1px solid #e8e1d4;">
  <tr>
    <td align="center" style="padding-top:28px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:.35em;font-weight:700;color:#9aab9a;">n</p>
      <p style="margin:0 0 8px;font-size:20px;letter-spacing:.32em;font-weight:700;color:#243026;">NOLYO</p>
      <div style="width:88px;height:1px;margin:0 auto 14px;background:#9aab9a;line-height:1;font-size:1px;">&nbsp;</div>
      <p style="margin:0;font-size:12px;line-height:1.7;color:#3a4034;">
        <a href="tel:${SIGNATURE.phone}" style="color:#3a4034;text-decoration:none;">${SIGNATURE.phoneDisplay}</a>
        <span style="color:#9aab9a;">&nbsp;|&nbsp;</span>
        <a href="mailto:${SIGNATURE.email}" style="color:#3a4034;text-decoration:none;">${SIGNATURE.email}</a>
        <span style="color:#9aab9a;">&nbsp;|&nbsp;</span>
        <a href="${siteHref}" style="color:#3a4034;text-decoration:none;">${SIGNATURE.site}</a>
      </p>
    </td>
  </tr>
</table>`
}

function wrapHtml(body) {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;background:#ffffff;font-family:Georgia,serif;color:#243026;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;padding:8px 0;">
          <tr>
            <td>
              ${body}
              ${signatureHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

/** Garde une adresse e-mail propre (évite « Name <mail> », espaces, HTML). */
function normalizeEmail(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const angled = raw.match(/<([^>]+)>/)
  const candidate = (angled ? angled[1] : raw).trim().replace(/^mailto:/i, '').toLowerCase()
  return EMAIL_RE.test(candidate) ? candidate : ''
}

/**
 * Envoi via EmailJS (1 template générique).
 * Dans le template EmailJS :
 *   To Email = {{{to_email}}}   (triples accolades — sinon le @ est échappé → 422 corrupted)
 *   Reply To = {{{reply_to}}}
 *   Subject  = {{subject}}
 *   Content  = {{{html_body}}}
 * Account → Security : activer l’API hors navigateur + private key
 */
async function sendMail({ to, subject, text, html, replyTo }) {
  const recipient = normalizeEmail(to)
  const reply = normalizeEmail(replyTo)
  if (!recipient || !subject) {
    return { skipped: true, reason: recipient ? 'missing-subject' : 'invalid-recipient' }
  }

  const htmlBody = html ? wrapHtml(html) : ''
  const rawText = text || (html ? String(html).replace(/<[^>]+>/g, ' ') : '')
  const message = `${rawText.trim()}${signatureText()}`

  if (!mailEnabled()) {
    console.warn('[mail:dry-run] EmailJS non configuré — e-mail non envoyé:', subject, '→', recipient)
    return { skipped: true, reason: 'emailjs-disabled' }
  }

  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        to_email: recipient,
        email: recipient,
        user_email: recipient,
        subject: String(subject).trim(),
        message,
        html_body: htmlBody,
        from_name: process.env.MAIL_FROM_NAME || 'Nolyo',
        reply_to: reply || recipient,
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY || undefined,
      },
    )
    return { ok: true }
  } catch (err) {
    const detail = err?.text || err?.message || String(err)
    console.error(`[mail] échec EmailJS → ${recipient} · ${subject} · ${detail}`)
    throw err
  }
}

module.exports = { sendMail, mailEnabled, wrapHtml, signatureHtml, signatureText }
