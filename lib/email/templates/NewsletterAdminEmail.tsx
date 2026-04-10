import { Text, Section } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface NewsletterAdminEmailProps {
  email: string
  locale: string
}

export function NewsletterAdminEmail({ email, locale }: NewsletterAdminEmailProps) {
  return (
    <BaseLayout previewText={`New newsletter subscriber: ${email}`}>
      <Text style={heading}>New Newsletter Subscriber</Text>

      <Section style={detailsBox}>
        <Text style={detailsText}>
          <strong>Email:</strong> {email}
        </Text>
        <Text style={detailsText}>
          <strong>Locale:</strong> {locale}
        </Text>
      </Section>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: '400' as const,
  color: '#000000',
  marginBottom: '24px',
  fontFamily: '"Playfair Display", Georgia, serif',
}

const detailsBox = {
  backgroundColor: '#F5F5F5',
  padding: '20px',
  borderRadius: '4px',
  margin: '16px 0',
}

const detailsText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#1A1A1A',
  margin: '8px 0',
}
