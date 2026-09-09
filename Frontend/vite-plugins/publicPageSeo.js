/**
 * Injecte title / Open Graph / JSON-LD dans le HTML initial des pages /p/:slug
 * pour que Google (et « Afficher le code source ») voient le vrai SEO, pas une SPA vide.
 */
export function publicPageSeoPlugin(apiOrigin) {
  return {
    name: 'nolyo-public-page-seo',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const raw = ctx.originalUrl || ctx.path || ''
        const pathOnly = raw.split('?')[0]
        const match = pathOnly.match(/^\/p\/([a-z0-9-]+)(\/a-propos|\/reserver)?\/?$/)
        if (!match) return html

        try {
          const path = `/p/${match[1]}${match[2] || ''}`
          const res = await fetch(`${apiOrigin}/api/public/seo?path=${encodeURIComponent(path)}`)
          if (!res.ok) return html
          const data = await res.json()
          const seo = data.seo
          if (!seo) return html

          let next = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`)
          const block = `
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <link rel="canonical" href="${escapeHtml(seo.url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Nolyo" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:url" content="${escapeHtml(seo.url)}" />
    ${seo.image ? `<meta property="og:image" content="${escapeHtml(seo.image)}" />` : ''}
    <meta name="twitter:card" content="${seo.image ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    ${seo.image ? `<meta name="twitter:image" content="${escapeHtml(seo.image)}" />` : ''}
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <script type="application/ld+json" id="nolyo-jsonld">${JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')}</script>`

          if (/<!--nolyo-seo-->[\s\S]*?<!--\/nolyo-seo-->/i.test(next)) {
            next = next.replace(/<!--nolyo-seo-->[\s\S]*?<!--\/nolyo-seo-->/i, `<!--nolyo-seo-->${block}<!--/nolyo-seo-->`)
          } else {
            next = next.replace(/<\/head>/i, `<!--nolyo-seo-->${block}<!--/nolyo-seo-->\n</head>`)
          }
          return next
        } catch {
          return html
        }
      },
    },
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
