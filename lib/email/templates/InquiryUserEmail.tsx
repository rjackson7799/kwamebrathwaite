import { Text } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface InquiryUserEmailProps {
  name: string
  inquiryType: string | null
  subject: string | null
}

export function InquiryUserEmail({ name, inquiryType, subject }: InquiryUserEmailProps) {
  const typeLabel = inquiryType
    ? inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1)
    : 'General'

  return (
    <BaseLayout previewText="Your inquiry has been received">
      <Text style={heading}>Inquiry Received</Text>

      <Text style={paragraph}>Dear {name},</Text>

      <Text style={paragraph}>
        Thank you for reaching out to us. We have received your{' '}
        {typeLabel.toLowerCase()} inquiry
        {subject ? ` regarding "${subject}"` : ''} and will respond as soon as
        possible.
      </Text>

      <Text style={paragraph}>
        A member of our team will review your message and get back to you within
        2–3 business days.
      </Text>

      <Text style={paragraph}>
        Best regards,
        <br />
        Kwame Brathwaite Archive
      </Text>
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

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#000000',
  margin: '16px 0',
}
