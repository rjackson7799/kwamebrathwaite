import { sanitizeHtml } from '@/lib/utils/sanitize-html'

interface RichTextContentProps {
  html: string
  className?: string
}

/**
 * Server component for rendering TipTap-produced HTML safely.
 *
 * Wraps the project's shared sanitizer (lib/utils/sanitize-html.ts) so every
 * read surface that displays admin-authored rich text — briefings,
 * exhibition preview_notes, future surfaces — runs through the same
 * allowlist. Avoids the inline `dangerouslySetInnerHTML` pattern used in
 * Phase 1 admin forms, where each consumer was its own sanitizer boundary.
 */
export function RichTextContent({ html, className }: RichTextContentProps) {
  const safe = sanitizeHtml(html)
  return (
    <div
      className={className ?? 'prose prose-neutral max-w-none'}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
