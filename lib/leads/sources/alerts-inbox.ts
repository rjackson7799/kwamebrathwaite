/**
 * Google Alerts inbox parser. Extracts article URLs from forwarded
 * Google Alert emails. Resolves Google's redirect URLs to their final targets.
 */

import * as cheerio from 'cheerio'

export interface AlertItem {
  title: string
  url: string
  snippet: string | null
}

const GOOGLE_REDIRECT_PREFIX = 'https://www.google.com/url?'

function unwrapGoogleRedirect(href: string): string {
  if (!href.startsWith(GOOGLE_REDIRECT_PREFIX)) return href
  try {
    const u = new URL(href)
    return u.searchParams.get('url') || u.searchParams.get('q') || href
  } catch {
    return href
  }
}

export function parseGoogleAlertsHtml(html: string): AlertItem[] {
  const $ = cheerio.load(html)
  const items: AlertItem[] = []
  const seen = new Set<string>()

  // Google Alerts emails place each article under an <a> with the article title.
  $('a').each((_, el) => {
    const $a = $(el)
    const href = ($a.attr('href') || '').trim()
    if (!href || !/^https?:/i.test(href)) return
    const url = unwrapGoogleRedirect(href)
    if (
      !url.startsWith('http') ||
      url.includes('google.com/alerts') ||
      url.includes('support.google.com')
    ) {
      return
    }
    const title = $a.text().trim()
    if (!title || title.length < 8) return
    if (seen.has(url)) return
    seen.add(url)

    // Find following snippet text in the parent block, if any.
    const snippet =
      $a
        .closest('table')
        .find('div, span, font')
        .filter((_, n) => $(n).text().trim().length > 30)
        .first()
        .text()
        .trim()
        .slice(0, 500) || null

    items.push({ title, url, snippet })
  })

  return items
}
