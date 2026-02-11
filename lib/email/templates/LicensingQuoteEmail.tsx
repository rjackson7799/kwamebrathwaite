import { Text, Section } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface LicensingQuoteEmailProps {
  name: string
  requestNumber: string
  quotedPrice: number
  message: string
}

export function LicensingQuoteEmail({
  name,
  requestNumber,
  quotedPrice,
  message,
}: LicensingQuoteEmailProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(quotedPrice)

  return (
    <BaseLayout previewText={`Quote for licensing request ${requestNumber}`}>
      <Text style={heading}>Your Licensing Quote</Text>

      <Text style={paragraph}>Dear {name},</Text>

      <Text style={paragraph}>
        Thank you for your patience. We are pleased to provide you with a quote
        for your licensing request <strong>{requestNumber}</strong>.
      </Text>

      <Section style={priceBox}>
        <Text style={priceLabel}>Quoted Price</Text>
        <Text style={priceAmount}>{formattedPrice}</Text>
      </Section>

      {message && (
        <>
          <Text style={messageLabel}>Message from our team:</Text>
          <Section style={messageBox}>
            <Text style={messageText}>{message}</Text>
          </Section>
        </>
      )}

      <Text style={paragraph}>
        If you have any questions about this quote or would like to proceed,
        please reply to this email and we will be happy to assist you.
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

const priceBox = {
  backgroundColor: '#000000',
  padding: '32px',
  borderRadius: '4px',
  margin: '32px 0',
  textAlign: 'center' as const,
}

const priceLabel = {
  fontSize: '14px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  color: '#B8945F',
  margin: '0 0 8px 0',
}

const priceAmount = {
  fontSize: '36px',
  fontWeight: '600' as const,
  color: '#ffffff',
  margin: '0',
}

const messageLabel = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#000000',
  marginBottom: '8px',
}

const messageBox = {
  backgroundColor: '#F5F5F5',
  padding: '20px',
  borderRadius: '4px',
  margin: '16px 0 32px 0',
}

const messageText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1A1A1A',
  whiteSpace: 'pre-wrap' as const,
  margin: '0',
}
