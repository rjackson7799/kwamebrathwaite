import { describe, it, expect } from 'vitest'
import en from '@/messages/en.json'
import fr from '@/messages/fr.json'
import ja from '@/messages/ja.json'

/**
 * Dynamic message lookups — t(`entryKind.${kind}`) — type-check fine and then
 * throw at runtime when a locale is missing the key. Only a test catches that.
 */

const ENTRY_KINDS = ['exhibition', 'screening', 'talk', 'event'] as const

type Messages = Record<string, unknown>

function get(obj: Messages, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

const locales: [string, Messages][] = [
  ['en', en as Messages],
  ['fr', fr as Messages],
  ['ja', ja as Messages],
]

describe('entryKind message keys exist in every locale', () => {
  for (const [name, messages] of locales) {
    for (const kind of ENTRY_KINDS) {
      it(`${name}: exhibitions.entryKind.${kind}`, () => {
        const value = get(messages, `exhibitions.entryKind.${kind}`)
        expect(typeof value).toBe('string')
        expect((value as string).length).toBeGreaterThan(0)
      })
    }
  }
})

describe('kind-aware detail headings exist in every locale', () => {
  // ExhibitionDetail renders t(`detail.about.${entryKind}`). Same dynamic-lookup
  // hazard as entryKind above: compiles fine, throws at runtime.
  for (const [name, messages] of locales) {
    for (const kind of ENTRY_KINDS) {
      it(`${name}: exhibitions.detail.about.${kind}`, () => {
        const value = get(messages, `exhibitions.detail.about.${kind}`)
        expect(typeof value).toBe('string')
        expect((value as string).length).toBeGreaterThan(0)
      })
    }
  }
})

describe('calendar export copy exists in every locale', () => {
  // AddToCalendarButton used to hard-code English here.
  const CALENDAR_KEYS = ['calendarDescription', 'calendarLocationFallback', 'calendarDownloaded']

  for (const [name, messages] of locales) {
    for (const key of CALENDAR_KEYS) {
      it(`${name}: exhibitions.map.${key}`, () => {
        expect(typeof get(messages, `exhibitions.map.${key}`)).toBe('string')
      })
    }

    it(`${name}: calendarDescription carries every ICU placeholder`, () => {
      // A locale that drops {url} silently ships a calendar entry with no link.
      const value = get(messages, 'exhibitions.map.calendarDescription') as string
      for (const placeholder of ['{kind}', '{location}', '{url}']) {
        expect(value).toContain(placeholder)
      }
    })
  }
})

describe('temporal status keys remain intact in every locale', () => {
  // The kind badge must never have displaced these — they are a separate lookup.
  for (const [name, messages] of locales) {
    for (const status of ['current', 'upcoming', 'past']) {
      it(`${name}: exhibitions.status.${status}`, () => {
        expect(typeof get(messages, `exhibitions.status.${status}`)).toBe('string')
      })
    }
  }
})
