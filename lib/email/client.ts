import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not configured — emails will not be sent')
}

export const resend = new Resend(process.env.RESEND_API_KEY || '')

export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'Kwame Brathwaite Archive <noreply@kwamebrathwaite.com>',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@kwamebrathwaite.com',
  siteName: 'Kwame Brathwaite Photo Archive',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com',
} as const
