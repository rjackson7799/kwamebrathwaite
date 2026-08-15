import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * This project is on Next.js 14, where a page's `params` prop is a PLAIN
 * OBJECT. Next.js 15 changed it to a Promise, and the 15 idiom is:
 *
 *     const { id } = use(params)      // params: Promise<{ id: string }>
 *
 * On 14 that hands React a plain object, and React's use() rejects anything
 * that isn't a Promise or Context — "Minified React error #438". It throws
 * during render, so the whole page is replaced by "Application error: a
 * client-side exception has occurred".
 *
 * It compiles and it builds. Only the browser catches it, which is why this
 * shipped. The correct client-side pattern here is useParams() from
 * next/navigation, as used by every other dynamic admin page.
 *
 * Note `await params` is NOT caught by this test and does not need to be:
 * awaiting a non-thenable simply returns the value, so it is harmless on 14.
 */

const APP_DIR = join(process.cwd(), 'app')

/**
 * Strip comments before matching. Without this the test trips on any comment
 * that merely *mentions* the banned pattern — including the ones warning
 * against it, which is how this test first failed.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('Next.js 14 params convention', () => {
  const files = walk(APP_DIR)

  it('finds files to check (guards against a broken walk)', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('no file calls use(params) — that is the Next 15 idiom and throws React #438 on 14', () => {
    const offenders = files.filter((f) => {
      // Matches use(params), use(props.params), use( params ) …
      const src = stripComments(readFileSync(f, 'utf8'))
      return /\buse\(\s*(?:props\.)?params\s*\)/.test(src)
    })

    expect(
      offenders.map((f) => f.replace(process.cwd(), '')),
      'Use useParams() from next/navigation instead'
    ).toEqual([])
  })

  // Mistyping params as a Promise is not itself a crash — `await` on a
  // non-thenable just returns the value, so these pages work today. They are
  // one refactor away from the bug above, though, so they are listed rather
  // than silently allowed. Fix opportunistically; do not add to this list.
  const KNOWN_PROMISE_TYPED_CLIENT_PAGES = ['/app/admin/licensing/[id]/page.tsx']

  it('no NEW client component types params as a Promise', () => {
    const offenders = files
      .filter((f) => {
        const src = stripComments(readFileSync(f, 'utf8'))
        if (!/^\s*['"]use client['"]/m.test(src)) return false
        return /params\s*:\s*Promise</.test(src)
      })
      .map((f) => f.replace(process.cwd(), '').replace(/\\/g, '/'))

    expect(
      offenders,
      'Client components should use useParams(), not a Promise-typed params prop'
    ).toEqual(KNOWN_PROMISE_TYPED_CLIENT_PAGES)
  })
})
