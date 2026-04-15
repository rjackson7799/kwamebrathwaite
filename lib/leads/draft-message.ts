/**
 * AI-drafted outreach intro message for a lead.
 * Always drafts in English; provides a separate translateToJapanese() that
 * applies appropriate keigo and salutation conventions.
 */

import OpenAI from 'openai'

const MODEL = 'gpt-4o-mini'

let client: OpenAI | null = null
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

export type IntroTone =
  | 'formal_museum'
  | 'warm_collector'
  | 'casual_press'
  | 'academic'
  | 'brand_outreach'

export const INTRO_TONES: IntroTone[] = [
  'formal_museum',
  'warm_collector',
  'casual_press',
  'academic',
  'brand_outreach',
]

export const INTRO_TONE_LABELS: Record<IntroTone, string> = {
  formal_museum: 'Formal — museum / institution',
  warm_collector: 'Warm — collector',
  casual_press: 'Casual — press / journalist',
  academic: 'Academic — researcher / educator',
  brand_outreach: 'Brand outreach — partnerships / licensing',
}

const TONE_GUIDANCE: Record<IntroTone, string> = {
  formal_museum:
    'Formal, respectful, third-person register. Reference the institution by name. Acknowledge their curatorial work. Suggest concrete next steps (loan, exhibition, acquisition).',
  warm_collector:
    'Warm but professional. Acknowledge their existing interest in this period of photography. Mention the archive can support specific acquisition needs (editions, condition reports, provenance).',
  casual_press:
    'Direct, friendly, journalist-to-publicist register. Lead with what is newsworthy. Offer the writer access to images, family, and archival material.',
  academic:
    'Scholarly, slightly formal. Reference the academic context (syllabus, research focus, related figures). Offer access to the archive for research, citations, and visiting scholar opportunities.',
  brand_outreach:
    'Confident, partnership-oriented. Frame the archive as a brand-aligned cultural asset. Offer licensing, collaboration, or co-branded campaign opportunities.',
}

export interface DraftMessageInput {
  leadTitle: string
  leadSummary: string | null
  leadCategory: string
  leadRegion: string
  sourceUrl: string
  organization: string | null
  contactName: string | null
  contactRole: string | null
  tone: IntroTone
  senderName: string
  senderTitle?: string
}

export interface DraftedMessage {
  subject: string
  body: string
}

export async function draftIntroMessage(
  input: DraftMessageInput
): Promise<DraftedMessage> {
  const openai = getClient()

  const systemPrompt = `You write outreach emails on behalf of the Kwame Brathwaite Photo Archive.

Kwame Brathwaite (1938-2023) founded the "Black is Beautiful" movement in 1960s Harlem with his Grandassa Models images. The archive licenses prints to museums, lends works to exhibitions, partners with brands, and supports academic research.

You write in English. The drafts must:
- Sound like a real person, not a marketing email. No emojis. No exclamation points unless genuinely warranted.
- Reference the specific opportunity from the lead context — never generic.
- Be 90-160 words. Tight.
- End with a single concrete ask (a meeting, an intro call, sharing materials).
- Open with the recipient's name when known. If only an organization is known, address the role directly (e.g. "Dear Curator,").
- Sign off with the sender's name${input.senderTitle ? ' and title' : ''}.

Tone: ${TONE_GUIDANCE[input.tone]}

Return ONLY valid JSON: { "subject": "...", "body": "..." }. No prose around it. Body uses plain text with paragraph breaks (\\n\\n).`

  const userPrompt = `Lead context:
- Title: ${input.leadTitle}
- Summary: ${input.leadSummary || '(none)'}
- Category: ${input.leadCategory}
- Region: ${input.leadRegion}
- Source: ${input.sourceUrl}
- Organization: ${input.organization || '(unknown)'}
- Contact name: ${input.contactName || '(unknown)'}
- Contact role: ${input.contactRole || '(unknown)'}

Sender:
- Name: ${input.senderName}${input.senderTitle ? `\n- Title: ${input.senderTitle}` : ''}

Draft the outreach email now.`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Empty draft response')

  const parsed = JSON.parse(content) as { subject?: string; body?: string }
  if (!parsed.subject || !parsed.body) {
    throw new Error('Draft missing subject or body')
  }

  return { subject: parsed.subject, body: parsed.body }
}

export async function translateToJapanese(
  message: DraftedMessage
): Promise<DraftedMessage> {
  const openai = getClient()

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Translate this English outreach email into natural, professional Japanese.

Apply Japanese business etiquette:
- Use proper keigo (honorific language) appropriate for first-time outreach to a curator, collector, journalist, scholar, or brand partner.
- Begin with the standard 拝啓 / 時候の挨拶 opening only if the original tone is formal; otherwise use a warm but polite opening (お世話になっております is overused — prefer はじめまして when truly cold outreach).
- Address the recipient with 様 by surname when known, or by role title (e.g. キュレーター様) when not.
- Close with the sender's name and 敬具 if formal.
- Subject line in Japanese, kept under 50 characters.

Return ONLY valid JSON: { "subject": "...", "body": "..." }. Body uses paragraph breaks (\\n\\n).`,
      },
      {
        role: 'user',
        content: `Subject: ${message.subject}\n\nBody:\n${message.body}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Empty translation response')

  const parsed = JSON.parse(content) as { subject?: string; body?: string }
  if (!parsed.subject || !parsed.body) {
    throw new Error('Translation missing subject or body')
  }

  return { subject: parsed.subject, body: parsed.body }
}
