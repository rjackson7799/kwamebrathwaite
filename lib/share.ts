/**
 * Share utility using Web Share API with clipboard fallback
 */

export interface ShareData {
  title: string
  text?: string
  url: string
}

/**
 * Check if Web Share API is available
 */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

/**
 * Share content using Web Share API or fallback to clipboard
 * @returns true if shared successfully, false if cancelled or failed
 */
export async function shareContent(data: ShareData): Promise<boolean> {
  // Try native Web Share API first (primarily mobile)
  if (canShare()) {
    try {
      await navigator.share(data)
      return true
    } catch (err) {
      // User cancelled sharing
      if ((err as Error).name === 'AbortError') {
        return false
      }
      // Fall through to clipboard fallback on other errors
    }
  }

  // Fallback: copy URL to clipboard
  return copyToClipboard(data.url)
}

/**
 * Copy text to clipboard
 * @returns true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('Clipboard API failed:', err)
    }
  }

  // Fallback for older browsers
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch (err) {
    console.error('execCommand fallback failed:', err)
    return false
  }
}
