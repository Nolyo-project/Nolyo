function absoluteUrl(origin, pathOrUrl) {
  if (!pathOrUrl) return ''
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = String(origin || '').replace(/\/$/, '')
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPublicSeoPayload(page, { origin, slug, pathSuffix = '' } = {}) {
  const site = String(origin || process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN || 'https://nolyo.fr').replace(
    /\/$/,
    '',
  )
  const path = `/p/${slug}${pathSuffix || ''}`
  const url = `${site}${path}`
  const titleBase = page.title || page.name || 'Professionnel'
  const title =
    pathSuffix === '/a-propos'
      ? `À propos — ${titleBase} | Nolyo`
      : pathSuffix === '/reserver'
        ? `Réserver — ${titleBase} | Nolyo`
        : `${titleBase} | Nolyo`

  const description = stripTags(
    pathSuffix === '/a-propos'
      ? page.about?.body || page.description || `À propos de ${titleBase} sur Nolyo.`
      : pathSuffix === '/reserver'
        ? `Prenez rendez-vous en ligne avec ${titleBase}. ${page.tradeLabel || ''}`.trim()
        : page.description || `${titleBase} sur Nolyo — prestations, avis et réservation en ligne.`,
  ).slice(0, 160)

  const image = absoluteUrl(site, page.banner || page.avatar || (page.photos || [])[0] || '')
  const reviews = Array.isArray(page.reviews) ? page.reviews : []
  const services = (page.services || []).filter((item) => item.kind !== 'heading')
  const avg =
    reviews.length > 0 ? Math.round((reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length) * 10) / 10 : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}#business`,
    name: titleBase,
    description,
    url: `${site}/p/${slug}`,
    image: image || undefined,
    telephone: page.phone || undefined,
    email: page.email || undefined,
    address: page.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: page.address,
          addressLocality: page.city || undefined,
          postalCode: page.postalCode || undefined,
          addressCountry: 'FR',
        }
      : undefined,
    geo:
      page.lat != null && page.lng != null
        ? { '@type': 'GeoCoordinates', latitude: page.lat, longitude: page.lng }
        : undefined,
    areaServed: page.city || undefined,
    aggregateRating:
      avg && reviews.length
        ? {
            '@type': 'AggregateRating',
            ratingValue: avg,
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    review: reviews.slice(0, 8).map((item) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: item.authorName },
      reviewRating: { '@type': 'Rating', ratingValue: item.rating, bestRating: 5 },
      reviewBody: item.body,
    })),
    hasOfferCatalog: services.length
      ? {
          '@type': 'OfferCatalog',
          name: 'Prestations',
          itemListElement: services.slice(0, 20).map((item, index) => ({
            '@type': 'Offer',
            position: index + 1,
            itemOffered: {
              '@type': 'Service',
              name: item.name,
            },
            price: item.price,
            priceCurrency: 'EUR',
            url: `${site}/p/${slug}/reserver`,
          })),
        }
      : undefined,
  }

  return { title, description, image, url, jsonLd, site }
}

function injectSeoIntoHtml(html, seo) {
  if (!seo) return html
  let next = html
  next = next.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`)

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
    <script type="application/ld+json" id="nolyo-jsonld">${JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')}</script>
  `

  if (/<!--nolyo-seo-->[\s\S]*?<!--\/nolyo-seo-->/i.test(next)) {
    next = next.replace(/<!--nolyo-seo-->[\s\S]*?<!--\/nolyo-seo-->/i, `<!--nolyo-seo-->${block}<!--/nolyo-seo-->`)
  } else {
    next = next.replace(/<\/head>/i, `<!--nolyo-seo-->${block}<!--/nolyo-seo-->\n</head>`)
  }
  return next
}

module.exports = { buildPublicSeoPayload, injectSeoIntoHtml, absoluteUrl }
