/**
 * AI Press Article Summarizer
 * Fetches a URL, extracts article content and metadata with cheerio,
 * and generates a summary using OpenAI GPT-4o.
 */

import OpenAI from 'openai'
import * as cheerio from 'cheerio'
import { PRESS_SUMMARY_SYSTEM_PROMPT, buildPressSummaryPrompt } from './prompts'
import { GPT_MODEL, COST_PER_1K_INPUT_TOKENS, COST_PER_1K_OUTPUT_TOKENS } from './config'
import type { PressSummaryResult } from './types'

// Lazy-load OpenAI client (same pattern as description-generator.ts)
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// GPT_MODEL and the COST_PER_1K_* constants come from ./config — see the import
// above. They used to be redeclared here and in description-generator.ts.
const MAX_BODY_SIZE = 500 * 1024 // 500KB
const FETCH_TIMEOUT = 10_000 // 10 seconds
const MAX_ARTICLE_WORDS = 4000

interface ExtractedMetadata {
  title: string | null
  author: string | null
  publication: string | null
  publish_date: string | null
}

/**
 * Fetch HTML content from a URL with timeout and size limits
 */
async function fetchArticleHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('URL does not point to a web article')
    }

    // Read with size limit
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const chunks: Uint8Array[] = []
    let totalSize = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalSize += value.byteLength
      if (totalSize > MAX_BODY_SIZE) {
        reader.cancel()
        break
      }
      chunks.push(value)
    }

    const decoder = new TextDecoder('utf-8')
    return chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join('') + decoder.decode()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Extract metadata (title, author, publication, date) from HTML using OG tags and meta tags
 */
function extractMetadata(html: string, url: string): ExtractedMetadata {
  const $ = cheerio.load(html)

  // Title: og:title -> meta title -> <title> -> <h1>
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="title"]').attr('content') ||
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    null

  // Author: article:author -> meta author -> byline class patterns
  const author =
    $('meta[property="article:author"]').attr('content') ||
    $('meta[name="author"]').attr('content') ||
    $('[class*="byline"] a').first().text().trim() ||
    $('[class*="author"] a').first().text().trim() ||
    $('[rel="author"]').first().text().trim() ||
    null

  // Publication: og:site_name -> domain fallback
  let publication =
    $('meta[property="og:site_name"]').attr('content') || null

  if (!publication) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '')
      // Capitalize domain parts for a reasonable fallback
      publication = hostname
        .split('.')
        .slice(0, -1)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    } catch {
      publication = null
    }
  }

  // Publish date: article:published_time -> <time datetime> -> meta date
  let publish_date =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    $('meta[name="date"]').attr('content') ||
    $('meta[name="publish-date"]').attr('content') ||
    null

  // Normalize to YYYY-MM-DD
  if (publish_date) {
    try {
      const parsed = new Date(publish_date)
      if (!isNaN(parsed.getTime())) {
        publish_date = parsed.toISOString().split('T')[0]
      } else {
        publish_date = null
      }
    } catch {
      publish_date = null
    }
  }

  return { title, author, publication, publish_date }
}

/**
 * Extract article body text from HTML, stripping navigation, ads, etc.
 */
function extractArticleText(html: string): string {
  const $ = cheerio.load(html)

  // Remove non-content elements
  $('script, style, nav, header, footer, aside, iframe, noscript').remove()
  $('[class*="ad-"], [class*="advert"], [class*="sidebar"], [class*="social-share"]').remove()
  $('[class*="newsletter"], [class*="subscribe"], [class*="related-"]').remove()
  $('[id*="comment"], [class*="comment"]').remove()

  // Try to find article content in priority order
  let text = ''

  const articleEl = $('article')
  if (articleEl.length > 0) {
    text = articleEl.first().text()
  }

  if (!text.trim()) {
    const mainEl = $('main, [role="main"]')
    if (mainEl.length > 0) {
      text = mainEl.first().text()
    }
  }

  if (!text.trim()) {
    // Fallback: collect all paragraphs
    const paragraphs: string[] = []
    $('body p').each((_, el) => {
      const pText = $(el).text().trim()
      if (pText.length > 40) {
        paragraphs.push(pText)
      }
    })
    text = paragraphs.join('\n\n')
  }

  // Clean whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()

  // Truncate to max words
  const words = text.split(/\s+/)
  if (words.length > MAX_ARTICLE_WORDS) {
    text = words.slice(0, MAX_ARTICLE_WORDS).join(' ')
  }

  return text
}

/**
 * Generate a summary of article text using GPT-4o
 */
async function summarizeArticle(
  articleText: string,
  wordCount: number
): Promise<{ summary: string; tokens_used: number; cost_usd: number }> {
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      { role: 'system', content: PRESS_SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: buildPressSummaryPrompt(articleText, wordCount) },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  })

  const summary = response.choices[0]?.message?.content?.trim() || ''
  const inputTokens = response.usage?.prompt_tokens || 0
  const outputTokens = response.usage?.completion_tokens || 0
  const cost =
    (inputTokens * COST_PER_1K_INPUT_TOKENS) / 1000 +
    (outputTokens * COST_PER_1K_OUTPUT_TOKENS) / 1000

  return {
    summary,
    tokens_used: inputTokens + outputTokens,
    cost_usd: Math.round(cost * 10000) / 10000,
  }
}

/**
 * Fetch a URL, extract article content and metadata, and generate a summary.
 *
 * @param url - The URL of the article to summarize
 * @param wordCount - Target word count for the summary (50-600)
 * @returns Summary text and extracted metadata
 */
export async function generatePressSummary(
  url: string,
  wordCount: number = 100
): Promise<PressSummaryResult> {
  // Fetch HTML
  const html = await fetchArticleHtml(url)

  // Extract metadata and article text
  const metadata = extractMetadata(html, url)
  const articleText = extractArticleText(html)

  if (!articleText || articleText.length < 100) {
    throw new Error(
      'Could not extract article content from this URL. The site may require a login or use JavaScript rendering.'
    )
  }

  // Generate summary with GPT-4o
  const { summary, tokens_used, cost_usd } = await summarizeArticle(articleText, wordCount)

  if (!summary) {
    throw new Error('Summary generation failed. Please try again.')
  }

  return {
    summary,
    ...metadata,
    tokens_used,
    cost_usd,
  }
}
