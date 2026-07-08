import { resend, EMAIL_CONFIG } from './client'
import type { ReactElement } from 'react'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: ReactElement
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Email not sent — RESEND_API_KEY not configured')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: options.to,
      subject: options.subject,
      react: options.react,
      replyTo: options.replyTo,
    })

    if (error) {
      console.error('Resend API error:', {
        name: error.name,
        message: error.message,
        to: options.to,
        subject: options.subject,
      })
      return { success: false, error: error.message }
    }

    console.log(`Email sent: ${data?.id} → ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
    return { success: true, id: data?.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to send email:', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      to: options.to,
      subject: options.subject,
    })
    return { success: false, error: message }
  }
}

export async function sendAdminEmail(subject: string, react: ReactElement): Promise<SendEmailResult> {
  return sendEmail({
    to: [EMAIL_CONFIG.adminEmail, ...EMAIL_CONFIG.adminCc],
    subject: `[Admin] ${subject}`,
    react,
  })
}

export async function sendUserEmail(
  to: string,
  subject: string,
  react: ReactElement
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject,
    react,
    replyTo: EMAIL_CONFIG.adminEmail,
  })
}
