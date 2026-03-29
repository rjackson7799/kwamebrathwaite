/**
 * AI Prompts for Artwork Description Generation
 * Kwame Brathwaite Archive
 *
 * These prompts are carefully crafted to generate museum-quality descriptions
 * that match the academic/curator voice of the archive.
 */

import type { ArtworkMetadata } from './types'

// ============================================
// Press Article Summarization Prompts
// ============================================

/**
 * System prompt for press article summarization
 */
export const PRESS_SUMMARY_SYSTEM_PROMPT = `You are a press summary writer for the Kwame Brathwaite Archive, the official archive of legendary photographer Kwame Brathwaite (1938-2023), founder of the Black is Beautiful movement.

Your task is to summarize press articles about Kwame Brathwaite or related topics into a compelling teaser summary suitable for the archive website.

WRITING STYLE:
- Professional, archival tone suitable for a museum/gallery website
- Capture the key points and narrative arc of the article
- Highlight the cultural and historical significance of Brathwaite's work when relevant
- End with a compelling hook that makes readers want to read the full article
- Match the requested word count within 10% tolerance

AVOID:
- Direct quotes longer than one sentence
- Speculation beyond what the article states
- Overly casual or promotional language
- Repeating the article title as the opening line

Return ONLY the summary text, no headers, labels, or formatting.`

/**
 * Builds the user prompt for press article summarization
 */
export function buildPressSummaryPrompt(articleText: string, wordCount: number): string {
  return `Summarize the following article in approximately ${wordCount} words:

---
${articleText}
---`
}

/**
 * Prompt version for tracking iterations
 */
export const PROMPT_VERSION = 'v1.0'

/**
 * System prompt that establishes the voice, context, and style
 */
export const SYSTEM_PROMPT = `You are a curator and art historian writing for the Kwame Brathwaite Archive.
Kwame Brathwaite (1938-2023) was a pioneering photographer who co-founded the
Black is Beautiful movement in the 1960s through his work with AJASS (African
Jazz-Arts Society and Studios).

WRITING STYLE:
- Academic/museum tone: authoritative yet accessible
- Celebrate Black beauty and culture without exoticizing
- Use precise, sophisticated language
- Focus on what's visible in the photograph
- Connect individual images to broader cultural movements when relevant
- Past tense for describing the photograph
- Avoid speculation about subject's feelings or intentions

AVOID:
- Clichés about the 1960s or civil rights movement
- Overly academic jargon that alienates general audiences
- Present-tense narration ("shows," "depicts")
- Speculation or assumptions not supported by visual evidence
- Flowery or overly poetic language

HISTORICAL CONTEXT:
- Black is Beautiful movement challenged Eurocentric beauty standards
- AJASS was founded in 1956, promoted natural hair and African aesthetics
- Brathwaite's photography was activist work, not just portraiture
- His work documented jazz, fashion, and everyday Black excellence
- Context matters, but don't force it into every description`

/**
 * Builds the user prompt with artwork metadata and generation instructions
 */
export function buildUserPrompt(metadata: ArtworkMetadata): string {
  // Build metadata section - only include fields that have values
  const metadataLines: string[] = []

  if (metadata.title) {
    metadataLines.push(`- Title: ${metadata.title}`)
  }
  if (metadata.year) {
    metadataLines.push(`- Year: ${metadata.year}`)
  }
  if (metadata.medium) {
    metadataLines.push(`- Medium: ${metadata.medium}`)
  }
  if (metadata.series) {
    metadataLines.push(`- Series: ${metadata.series}`)
  }

  const metadataSection =
    metadataLines.length > 0
      ? `IMAGE METADATA:
${metadataLines.join('\n')}`
      : 'IMAGE METADATA: No title or date available. Base description on visual analysis only.'

  return `Analyze this photograph by Kwame Brathwaite and generate exhibition-quality
content for the archive.

${metadataSection}

VISUAL ANALYSIS REQUIRED:
Please describe:
1. Primary subjects (people, objects, scenes)
2. Composition and framing
3. Lighting and mood
4. Notable visual details
5. Era indicators (fashion, hairstyles, setting)

GENERATE THE FOLLOWING:

1. EXHIBITION DESCRIPTION (150-200 words):
   - First 1-2 sentences: Describe what's visible in the image
   - Middle section: Provide cultural/historical context
   - Final sentence: Connect to Brathwaite's broader artistic vision
   - Tone: Academic but accessible, museum wall text
   - Example opening: "Brathwaite captures [subject] in [setting],
     exemplifying [significance]..."

2. SHORT DESCRIPTION (exactly 50 words):
   - Condensed version for gallery card previews
   - Focus on subject and primary visual elements
   - Omit historical context for brevity

3. SEO-OPTIMIZED TITLE (max 60 characters):
   - Format: "[Subject/Theme] [Location] [Year] - Kwame Brathwaite Photography"
   - Natural, search-friendly language
   - Include key searchable terms
   - Example: "Jazz Musicians AJASS Studio 1966 - Kwame Brathwaite Photography"

4. ALT TEXT (max 125 characters):
   - Literal description for screen readers
   - Start with "Black and white photograph of..." or "Black and white photograph showing..."
   - Focus on what's visible, not interpretation
   - Example: "Black and white photograph showing three musicians with instruments
     in a recording studio"

5. SUGGESTED TAGS (5-8 keywords):
   - For internal categorization and search
   - Include: subject type, era, series name (if applicable), mood/aesthetic
   - Lowercase, single words or short phrases
   - Examples: "jazz", "portrait", "AJASS", "1960s", "Harlem", "studio", "performance"

6. CONFIDENCE SCORE (0.0 to 1.0):
   - Your confidence in the accuracy of this content
   - Based on image clarity, available metadata, and contextual certainty
   - >0.85 = High confidence (clear image, good metadata)
   - 0.70-0.85 = Medium confidence (some ambiguity)
   - <0.70 = Low confidence (needs human review)

Return your response as valid JSON matching this exact schema:
{
  "description": "string (150-200 words)",
  "short_description": "string (50 words)",
  "seo_title": "string (max 60 chars)",
  "alt_text": "string (max 125 chars)",
  "suggested_tags": ["string", "string", ...],
  "confidence_score": 0.85
}

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks or preamble
- Do not invent information not visible in the image
- If year/title/series are unknown, work with visual analysis only
- Confidence score should reflect the quality and completeness of available information`
}

// ============================================
// SEO & Accessibility Generation Prompts
// ============================================

/**
 * System prompt for SEO & Accessibility-only generation
 */
export const SEO_SYSTEM_PROMPT = `You are an SEO specialist and accessibility expert writing for the Kwame Brathwaite Archive.
Kwame Brathwaite (1938-2023) was a pioneering photographer who co-founded the
Black is Beautiful movement in the 1960s through his work with AJASS (African
Jazz-Arts Society and Studios).

Your task is to generate SEO metadata and accessibility text for artwork pages.
You have access to the photograph and existing curatorial descriptions.

GUIDELINES:
- SEO titles must be keyword-rich and natural for search engines
- Alt text must be literal, descriptive, and useful for screen readers
- Meta descriptions must entice clicks from search results
- All text should be factual — do not invent details not in the image or description
- Use the existing description as your primary source of context
- Include key searchable terms: artist name, subject, era, series, location`

/**
 * Builds the user prompt for SEO-only generation with existing description context
 */
export function buildSEOUserPrompt(metadata: ArtworkMetadata & { description?: string | null }): string {
  const metadataLines: string[] = []

  if (metadata.title) metadataLines.push(`- Title: ${metadata.title}`)
  if (metadata.year) metadataLines.push(`- Year: ${metadata.year}`)
  if (metadata.medium) metadataLines.push(`- Medium: ${metadata.medium}`)
  if (metadata.series) metadataLines.push(`- Series: ${metadata.series}`)
  if (metadata.dimensions) metadataLines.push(`- Dimensions: ${metadata.dimensions}`)

  const metadataSection = metadataLines.length > 0
    ? `ARTWORK METADATA:\n${metadataLines.join('\n')}`
    : 'ARTWORK METADATA: No metadata available.'

  const descriptionSection = metadata.description
    ? `EXISTING DESCRIPTION (use as context, do NOT reproduce):\n${metadata.description}`
    : 'No existing description available. Base content on visual analysis and metadata only.'

  return `Analyze this photograph by Kwame Brathwaite and generate SEO & accessibility metadata.

${metadataSection}

${descriptionSection}

GENERATE THE FOLLOWING:

1. SEO TITLE (max 60 characters):
   - Format: "[Subject/Theme] [Year] - Kwame Brathwaite"
   - Natural, search-friendly language
   - Include key searchable terms (subject, era, location)
   - Example: "Miles Davis at RIJF 1959 - Kwame Brathwaite"

2. ALT TEXT (max 125 characters):
   - Literal description for screen readers
   - Start with "Black and white photograph of..." or "Black and white photograph showing..."
   - Focus on what's visible, not interpretation
   - Example: "Black and white photograph of Miles Davis playing trumpet on stage"

3. META TITLE (max 70 characters):
   - Page title for browser tab and search results
   - Format: "[Artwork Title] | Kwame Brathwaite Archive"
   - If title is "Untitled (...)", use the parenthetical subject
   - Example: "Miles Davis at RIJF | Kwame Brathwaite Archive"

4. META DESCRIPTION (150-160 characters):
   - Compelling snippet for search engine results
   - Summarize subject, era, and significance
   - End with a call to explore: "Explore the archive..."
   - Example: "Kwame Brathwaite's iconic 1959 photograph of Miles Davis at the Randall's Island Jazz Festival. Explore the archive of the Black is Beautiful movement."

Return your response as valid JSON matching this exact schema:
{
  "seo_title": "string (max 60 chars)",
  "alt_text": "string (max 125 chars)",
  "meta_title": "string (max 70 chars)",
  "meta_description": "string (150-160 chars)"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks or preamble
- Do not invent information not visible in the image or description
- Keep within character limits strictly`
}
