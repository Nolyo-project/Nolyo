import { useEffect } from 'react'

function upsertMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/**
 * SEO dynamique pour les pages publiques Pro.
 */
export default function SeoHead({
  title,
  description,
  image,
  url,
  type = 'website',
  jsonLd,
}) {
  useEffect(() => {
    const previousTitle = document.title
    if (title) document.title = title

    const absoluteImage =
      image && !/^https?:\/\//i.test(image) && typeof window !== 'undefined'
        ? `${window.location.origin}${image.startsWith('/') ? '' : '/'}${image}`
        : image

    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', absoluteImage)
    upsertMeta('property', 'og:locale', 'fr_FR')
    upsertMeta('property', 'og:site_name', 'Nolyo')
    upsertMeta('name', 'twitter:card', absoluteImage ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', absoluteImage)
    upsertMeta('name', 'robots', 'index,follow')
    upsertLink('canonical', url)

    if (jsonLd) {
      const payload = { ...jsonLd }
      if (absoluteImage && !payload.image) payload.image = absoluteImage
      else if (absoluteImage && typeof payload.image === 'string' && !/^https?:\/\//i.test(payload.image)) {
        payload.image = absoluteImage
      }
      upsertJsonLd('nolyo-jsonld', payload)
    }

    return () => {
      document.title = previousTitle
    }
  }, [title, description, image, url, type, jsonLd])

  return null
}
