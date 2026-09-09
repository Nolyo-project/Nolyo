const emailjs = require('@emailjs/nodejs')
const { publicOrigin, publicUrl } = require('./site')

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

/** Signature HTML fidèle au bloc logo + contacts (compatible clients mail). */
function signatureHtml() {
  const siteHref = publicOrigin() || `https://${SIGNATURE.site}`
  const imgSrc = publicUrl('/brand/email-signature.png')
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:36px;border-top:1px solid #e8e1d4;">
  <tr>
    <td align="center" style="padding-top:28px;">
      <!--[if !mso]><!-- -->
      <img src="${imgSrc}" alt="NOLYO" width="280" style="display:block;margin:0 auto;max-width:280px;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
      <!--<![endif]-->
      <!-- Fallback texte (Outlook / image bloquée) -->
      <div style="font-family:Arial,Helvetica,sans-serif;">
        <!--[if mso]>
        <p style="margin:0 0 6px;font-size:22px;letter-spacing:.28em;font-weight:700;color:#243026;">NOLYO</p>
        <p style="margin:0 0 14px;border-bottom:1px solid #9aab9a;width:96px;line-height:1;">&nbsp;</p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#3a4034;">
          <a href="tel:${SIGNATURE.phone}" style="color:#3a4034;text-decoration:none;">${SIGNATURE.phoneDisplay}</a>
          &nbsp;|&nbsp;
          <a href="mailto:${SIGNATURE.email}" style="color:#3a4034;text-decoration:none;">${SIGNATURE.email}</a>
          &nbsp;|&nbsp;
          <a href="${siteHref}" style="color:#3a4034;text-decoration:none;">${SIGNATURE.site}</a>
        </p>
        <![endif]-->
      </div>
    </td>
  </tr>
</table>`
}

/**
 * Version HTML pure (sans image) — même mise en page que la signature fournie.
 * Utilisée si MAIL_SIGNATURE_MODE=html, sinon image + fallback.
 */
function signatureHtmlBuilt() {
  const siteHref = publicOrigin() || `https://${SIGNATURE.site}`
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:36px;border-top:1px solid #e8e1d4;">
  <tr>
    <td align="center" style="padding-top:28px;font-family:Arial,Helvetica,sans-serif;">
      <div style="width:36px;height:36px;line-height:36px;margin:0 auto 10px;border-radius:10px;background:#9aab9a;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.04em;">n</div>
      <p style="margin:0 0 8px;font-size:20px;letter-spacing:.32em;font-weight:700;color:#243026;">NOLYO</p>
      <div style="width:88px;height:1px;margin:0 auto 14px;background:#9aab9a;"></div>
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

function pickSignatureHtml() {
  // html = rendu CSS (fiable partout) ; image = fichier brand/email-signature.png
  const mode = String(process.env.MAIL_SIGNATURE_MODE || 'html').toLowerCase()
  return mode === 'image' ? signatureHtml() : signatureHtmlBuilt()
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
              ${pickSignatureHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Envoi via EmailJS (1 template générique : to_email, subject, message, html_body).
 * Activer « Allow EmailJS API for non-browser applications » dans Account → Security.
 */
async function sendMail({ to, subject, text, html }) {
  if (!to || !subject) return { skipped: true }

  const htmlBody = html ? wrapHtml(html) : ''
  const rawText = text || (html ? String(html).replace(/<[^>]+>/g, ' ') : '')
  const message = `${rawText.trim()}${signatureText()}`

  if (!mailEnabled()) {
    console.info('[mail:dry-run]', subject, '→', to)
    return { skipped: true }
  }

  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    process.env.EMAILJS_TEMPLATE_ID,
    {
      to_email: to,
      subject,
      message,
      html_body: htmlBody,
      from_name: process.env.MAIL_FROM_NAME || 'Nolyo',
    },
    {
      publicKey: process.env.EMAILJS_PUBLIC_KEY,
      privateKey: process.env.EMAILJS_PRIVATE_KEY || undefined,
    },
  )
  return { ok: true }
}

module.exports = { sendMail, mailEnabled, wrapHtml, signatureHtml: pickSignatureHtml, signatureText }
