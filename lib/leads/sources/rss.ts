/**
 * RSS / Atom fetch + parse using cheerio (already a dep). Free.
 */

import * as cheerio from 'cheerio'

export interface RssItem {
  title: string
  url: string
  publishedDate: string | null
  snippet: string | null
}

const FETCH_TIMEOUT_MS = 15_000
const MAX_BODY_BYTES = 2 * 1024 * 1024

export async function fetchRssFeed(feedUrl: string): Promise<RssItem[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  let xml: string
  try {
    const res = await fetch(feedUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'KB-Archive-Lead-Bot/1.0 (+https://kwamebrathwaite.com)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BODY_BYTES) {
      throw new Error(`Feed too large (${buf.byteLength} bytes)`)
    }
    xml = new TextDecoder('utf-8').decode(buf)
  } finally {
    clearTimeout(timer)
  }

  const $ = cheerio.load(xml, { xmlMode: true })
  const out: RssItem[] = []

  // RSS 2.0
  $('item').each((_, el) => {
    const $el = $(el)
    const url = $el.find('link').first().text().trim() || $el.find('guid').first().text().trim()
    const title = $el.find('title').first().text().trim()
    if (!url || !title) return
    out.push({
      title,
      url,
      publishedDate: $el.find('pubDate').first().text().trim() || null,
      snippet:
        stripHtml($el.find('description').first().text() || $el.find('content\\:encoded').first().text()) ||
        null,
    })
  })

  // Atom
  $('entry').each((_, el) => {
    const $el = $(el)
    const url =
      $el.find('link[rel="alternate"]').attr('href') ||
      $el.find('link').first().attr('href') ||
      $el.find('id').first().text().trim()
    const title = $el.find('title').first().text().trim()
    if (!url || !title) return
    out.push({
      title,
      url,
      publishedDate: $el.find('updated').first().text().trim() || $el.find('published').first().text().trim() || null,
      snippet: stripHtml($el.find('summary').first().text() || $el.find('content').first().text()) || null,
    })
  })

  return out
}

function stripHtml(s: string | undefined): string {
  if (!s) return ''
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800)
}
