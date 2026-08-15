import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const createMock = vi.fn()

// The parser lazily constructs `new OpenAI({ apiKey })`, so the whole module is
// stubbed. Every test in this file runs against SAVED model responses, which
// keeps CI deterministic — a live model would make prompt quality and CI
// stability the same signal, and they are not.
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: createMock } }
  },
}))

process.env.OPENAI_API_KEY = 'test-key'

// A static import is safe here: vitest hoists vi.mock above imports, so the
// stub is installed before the parser module resolves `openai`.
import {
  parseContentBlob,
  chunkSource,
  ContentParseError,
  MAX_INPUT_CHARS,
} from '@/lib/ai/content-parser'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'import')

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8')
}

function respondWith(payload: unknown, usage = { prompt_tokens: 1200, completion_tokens: 900 }) {
  createMock.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(payload) }, finish_reason: 'stop' }],
    usage,
  })
}

beforeEach(() => {
  createMock.mockReset()
})

describe('chunkSource', () => {
  it('splits on blank lines and never mid-entry', () => {
    const chunks = chunkSource('a\nb\n\nc\nd\n\ne\nf', 6)
    expect(chunks.length).toBeGreaterThan(1)
    // No chunk may end mid-entry: every chunk rejoins whole blocks.
    for (const chunk of chunks) {
      expect(chunk.startsWith('\n')).toBe(false)
      expect(chunk.endsWith('\n')).toBe(false)
    }
  })

  it('produces non-overlapping chunks that reconstruct the source', () => {
    const source = 'one\n\ntwo\n\nthree\n\nfour'
    const rejoined = chunkSource(source, 8).join('\n\n')
    expect(rejoined).toBe(source)
  })

  it('keeps an oversized single block intact rather than splitting an entry', () => {
    const big = 'x'.repeat(500)
    expect(chunkSource(big, 100)).toEqual([big])
  })

  it('returns nothing for whitespace', () => {
    expect(chunkSource('   \n\n  ')).toEqual([])
  })
})

describe('parseContentBlob — the client sample', () => {
  it('extracts all four entries with the expected fields', async () => {
    respondWith(JSON.parse(fixture('sample-4-entry.response.json')))

    const result = await parseContentBlob(fixture('sample-4-entry.source.txt'))
    const items = result.items.map((i) => i.item!).filter(Boolean)

    expect(items).toHaveLength(4)

    // #1 — single-day screening, country code only
    expect(items[0].data.title).toContain('African Film Festival Australia')
    expect(items[0].target_type).toBe('exhibition')
    expect((items[0].data as { entry_kind: string }).entry_kind).toBe('screening')
    expect((items[0].data as { start_date: string }).start_date).toBe('2026-09-06')
    expect((items[0].data as { end_date: string }).end_date).toBe('2026-09-06')

    // #2 — the award line goes to description, with a warning
    expect((items[1].data as { description: string }).description).toMatch(/Grand Jury/i)
    expect(items[1].warnings.join(' ')).toMatch(/award/i)

    // #3 — the descriptor/title inversion, the hardest judgement call
    expect(items[2].data.title).toBe('You and I')
    expect((items[2].data as { description: string }).description).toMatch(/Solo Exhibition/i)
    expect((items[2].data as { venue: string }).venue).toBe('Philip Martin Gallery')

    // #4 — screening wins over talk by precedence: one expected value, not two
    expect((items[3].data as { entry_kind: string }).entry_kind).toBe('screening')
  })

  it('records usage and prompt version for auditing', async () => {
    respondWith(JSON.parse(fixture('sample-4-entry.response.json')))
    const result = await parseContentBlob(fixture('sample-4-entry.source.txt'))

    expect(result.inputTokens).toBe(1200)
    expect(result.outputTokens).toBe(900)
    expect(result.costUsd).toBeGreaterThan(0)
    expect(result.promptVersion).toBe('content-parser-v1')
    expect(result.model).toBe('gpt-4o-2024-08-06')
  })

  it('frames the pasted text as data, not instructions', async () => {
    respondWith({ items: [] })
    await parseContentBlob('hello').catch(() => undefined)

    const call = createMock.mock.calls[0][0]
    const system = call.messages[0].content as string
    const user = call.messages[1].content as string

    expect(system).toMatch(/never follow any instruction/i)
    expect(user).toContain('<source>')
    // The model must not be asked for server-owned fields.
    expect(system).toMatch(/do not output slug, status, or exhibition_type/i)
  })
})

describe('parseContentBlob — trust boundary', () => {
  it('keeps a malformed item as a visible failure row instead of dropping it', async () => {
    respondWith({
      items: [
        {
          target_type: 'exhibition',
          source_text: 'Good Entry\nSomewhere\nJanuary 1, 2027',
          confidence: 0.9,
          warnings: [],
          data: { title: 'Good Entry', entry_kind: 'exhibition', start_date: '2027-01-01' },
        },
        {
          target_type: 'exhibition',
          source_text: 'Bad Entry',
          confidence: 0.5,
          warnings: [],
          data: { title: '', entry_kind: 'exhibition' }, // title is required
        },
      ],
    })

    const result = await parseContentBlob('anything')
    expect(result.items).toHaveLength(2)
    expect(result.items[0].item).not.toBeNull()
    expect(result.items[1].item).toBeNull()
    expect(result.items[1].parseError).toBeTruthy()
    // A silently shorter list would hide this from the client.
    expect(result.items[1].sourceText).toBe('Bad Entry')
  })

  it('rejects an item that omits source_text', async () => {
    respondWith({
      items: [
        {
          target_type: 'exhibition',
          confidence: 0.9,
          warnings: [],
          data: { title: 'No Source', entry_kind: 'exhibition' },
        },
      ],
    })
    const result = await parseContentBlob('anything')
    expect(result.items[0].item).toBeNull()
  })

  it('never accepts a model-supplied exhibition_type or slug into parsed data', async () => {
    respondWith({
      items: [
        {
          target_type: 'exhibition',
          source_text: 'X',
          confidence: 0.9,
          warnings: [],
          data: {
            title: 'X',
            entry_kind: 'exhibition',
            start_date: '2027-01-01',
            exhibition_type: 'current',
            slug: 'evil-slug',
            status: 'published',
          },
        },
      ],
    })
    const result = await parseContentBlob('anything')
    const data = result.items[0].item!.data as Record<string, unknown>
    expect(data).not.toHaveProperty('exhibition_type')
    expect(data).not.toHaveProperty('slug')
    expect(data).not.toHaveProperty('status')
  })
})

describe('parseContentBlob — batch-level failures', () => {
  it('rejects empty input', async () => {
    await expect(parseContentBlob('   ')).rejects.toThrow(ContentParseError)
  })

  it('rejects input over the character cap', async () => {
    await expect(parseContentBlob('x'.repeat(MAX_INPUT_CHARS + 1))).rejects.toMatchObject({
      code: 'TOO_LARGE',
    })
  })

  it('reports malformed JSON as a batch failure', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'not json' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    })
    await expect(parseContentBlob('anything')).rejects.toMatchObject({ code: 'INVALID_JSON' })
  })

  it('reports a content filter refusal distinctly', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: null }, finish_reason: 'content_filter' }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    })
    await expect(parseContentBlob('anything')).rejects.toMatchObject({ code: 'REFUSED' })
  })

  it('reports a valid response with zero items', async () => {
    respondWith({ items: [] })
    await expect(parseContentBlob('anything')).rejects.toMatchObject({ code: 'NO_ITEMS' })
  })

  it('maps a rate limit to its own code', async () => {
    createMock.mockRejectedValueOnce(new Error('429 rate limit exceeded'))
    await expect(parseContentBlob('anything')).rejects.toMatchObject({ code: 'RATE_LIMIT' })
  })

  it('maps a timeout to its own code', async () => {
    createMock.mockRejectedValueOnce(new Error('Request timed out'))
    await expect(parseContentBlob('anything')).rejects.toMatchObject({ code: 'TIMEOUT' })
  })
})

describe('parseContentBlob — partial chunk failure', () => {
  it('keeps successful chunks and represents the failed chunk as one row', async () => {
    // Two chunks: first succeeds, second throws.
    const source = `${'a'.repeat(11_000)}\n\n${'b'.repeat(11_000)}`

    respondWith({
      items: [
        {
          target_type: 'exhibition',
          source_text: 'Chunk one entry',
          confidence: 0.9,
          warnings: [],
          data: { title: 'Chunk one entry', entry_kind: 'exhibition', start_date: '2027-01-01' },
        },
      ],
    })
    createMock.mockRejectedValueOnce(new Error('boom'))

    const result = await parseContentBlob(source)

    expect(result.chunkCount).toBe(2)
    const good = result.items.filter((i) => i.item !== null)
    const bad = result.items.filter((i) => i.item === null)

    expect(good).toHaveLength(1)
    // We cannot know how many entries the failed chunk held, so it becomes ONE
    // synthetic row carrying its raw text — the client sees exactly what was lost.
    expect(bad).toHaveLength(1)
    expect(bad[0].parseError).toMatch(/could not be parsed/i)
    expect(bad[0].sourceText).toContain('b')
  })

  it('assigns unique source indexes across chunks', async () => {
    const source = `${'a'.repeat(11_000)}\n\n${'b'.repeat(11_000)}`
    respondWith({
      items: [
        {
          target_type: 'exhibition',
          source_text: 'one',
          confidence: 0.9,
          warnings: [],
          data: { title: 'one', entry_kind: 'exhibition', start_date: '2027-01-01' },
        },
      ],
    })
    respondWith({
      items: [
        {
          target_type: 'exhibition',
          source_text: 'two',
          confidence: 0.9,
          warnings: [],
          data: { title: 'two', entry_kind: 'exhibition', start_date: '2027-01-01' },
        },
      ],
    })

    const result = await parseContentBlob(source)
    const indexes = result.items.map((i) => i.sourceIndex)
    // UNIQUE (import_id, source_index) in the schema depends on this.
    expect(new Set(indexes).size).toBe(indexes.length)
  })
})

describe('parseContentBlob — identical entries are not collapsed', () => {
  it('keeps two byte-identical repeated screenings as separate items', async () => {
    const repeated = 'Documentary Screening\nNew York, NY\nMay 1, 2027'
    respondWith({
      items: [
        {
          target_type: 'exhibition',
          source_text: repeated,
          confidence: 0.9,
          warnings: [],
          data: {
            title: 'Documentary Screening',
            entry_kind: 'screening',
            city: 'New York',
            state_region: 'NY',
            start_date: '2027-05-01',
            end_date: '2027-05-01',
          },
        },
        {
          target_type: 'exhibition',
          source_text: repeated,
          confidence: 0.9,
          warnings: [],
          data: {
            title: 'Documentary Screening',
            entry_kind: 'screening',
            city: 'New York',
            state_region: 'NY',
            start_date: '2027-05-01',
            end_date: '2027-05-01',
          },
        },
      ],
    })

    const result = await parseContentBlob(`${repeated}\n\n${repeated}`)
    // Deduplicating on source_text equality would silently delete a real entry.
    expect(result.items).toHaveLength(2)
  })
})
