import { Text, Section } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface LicensingRequestUserEmailProps {
  name: string
  requestNumber: string
  licenseType: string
  artworkCount: number
}

export function LicensingRequestUserEmail({
  name,
  requestNumber,
  licenseType,
  artworkCount,
}: LicensingRequestUserEmailProps) {
  return (
    <BaseLayout previewText={`Licensing request ${requestNumber} received`}>
      <Text style={heading}>Request Received</Text>

      <Text style={paragraph}>Dear {name},</Text>

      <Text style={paragraph}>
        Thank you for your licensing inquiry. We have received your request and
        assigned it reference number <strong>{requestNumber}</strong>.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailsText}>
          <strong>Request Number:</strong> {requestNumber}
        </Text>
        <Text style={detailsText}>
          <strong>License Type:</strong> {licenseType}
        </Text>
        <Text style={detailsText}>
          <strong>Artworks:</strong> {artworkCount}{' '}
          {artworkCount === 1 ? 'image' : 'images'}
        </Text>
      </Section>

      <Text style={paragraph}>
        We will review your request and respond with a quote within 3–5 business
        days. If you have any questions in the meantime, please reply to this
        email.
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

const detailsBox = {
  backgroundColor: '#F5F5F5',
  padding: '20px',
  borderRadius: '4px',
  margin: '24px 0',
}

const detailsText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#1A1A1A',
  margin: '8px 0',
}
