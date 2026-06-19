import { Text } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface FounderInquiryAckEmailProps {
  name: string
}

export function FounderInquiryAckEmail({ name }: FounderInquiryAckEmailProps) {
  return (
    <BaseLayout previewText="We received your Founders Circle inquiry">
      <Text style={eyebrow}>The Kwame Brathwaite Archive &nbsp;·&nbsp; Founder&rsquo;s Circle</Text>

      <Text style={heading}>Thank you for reaching out.</Text>

      <Text style={paragraph}>Dear {name},</Text>

      <Text style={paragraph}>
        We&rsquo;ve received your inquiry about joining the Founder&rsquo;s
        Circle. A member of the stewardship team will be in touch personally
        within 24 to 48 hours to continue the conversation.
      </Text>

      <Text style={paragraph}>
        The Founder&rsquo;s Circle is a curated philanthropic program
        supporting the permanent infrastructure of the archive. Membership is
        by invitation, and we take the time to make each introduction
        intentional.
      </Text>

      <Text style={paragraph}>
        We look forward to speaking with you soon.
      </Text>

      <Text style={paragraph}>
        With gratitude,
        <br />
        The Kwame Brathwaite Archive
      </Text>
    </BaseLayout>
  )
}

const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: '#8a6f2b',
  marginBottom: '24px',
  fontFamily: '"Playfair Display", Georgia, serif',
}

const heading = {
  fontSize: '28px',
  fontWeight: '400' as const,
  color: '#000000',
  marginBottom: '24px',
  fontFamily: '"Playfair Display", Georgia, serif',
  lineHeight: '34px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#1A1A1A',
  margin: '16px 0',
}
