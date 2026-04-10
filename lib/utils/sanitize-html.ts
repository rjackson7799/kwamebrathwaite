import sanitize from 'sanitize-html'

export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'mark', 'sub', 'sup',
      'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'hr', 'span', 'div',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'title'],
      a: ['href', 'title', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  })
}
