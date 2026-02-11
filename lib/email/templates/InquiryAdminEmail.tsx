import { Text, Section, Link, Hr } from '@react-email/components'
import { BaseLayout } from './BaseLayout'
import { EMAIL_CONFIG } from '../client'

interface InquiryAdminEmailProps {
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  inquiryType: string | null
  artworkId: string | null
  locale: string
}

export function InquiryAdminEmail(props: InquiryAdminEmailProps) {
  const adminUrl = `${EMAIL_CONFIG.siteUrl}/admin/inquiries`
  const typeLabel = props.inquiryType
    ? props.inquiryType.charAt(0).toUpperCase() + props.inquiryType.slice(1)
    : 'General'

  return (
    <BaseLayout previewText={`New ${typeLabel.toLowerCase()} inquiry from ${props.name}`}>
      <Text style={heading}>New {typeLabel} Inquiry</Text>

      <Section style={detailsBox}>
        <Text style={detailsHeading}>Contact Information</Text>
        <Text style={detailsText}>
          <strong>Name:</strong> {props.name}
        </Text>
        <Text style={detailsText}>
          <strong>Email:</strong> {props.email}
        </Text>
        {props.phone && (
          <Text style={detailsText}>
            <strong>Phone:</strong> {props.phone}
          </Text>
        )}
        <Text style={detailsText}>
          <strong>Type:</strong> {typeLabel}
        </Text>
        {props.subject && (
          <Text style={detailsText}>
            <strong>Subject:</strong> {props.subject}
          </Text>
        )}
        {props.artworkId && (
          <Text style={detailsText}>
            <strong>Related Artwork ID:</strong> {props.artworkId}
          </Text>
        )}
        <Text style={detailsText}>
          <strong>Locale:</strong> {props.locale}
        </Text>
      </Section>

      <Hr style={divider} />

      <Section>
        <Text style={detailsHeading}>Message</Text>
        <Text style={messageText}>{props.message}</Text>
      </Section>

      <Hr style={divider} />

      <Section style={{ textAlign: 'center' as const }}>
        <Link href={adminUrl} style={button}>
          View in Admin Panel
        </Link>
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

const detailsHeading = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#000000',
  marginBottom: '12px',
}

const detailsText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#1A1A1A',
  margin: '8px 0',
}

const messageText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1A1A1A',
  whiteSpace: 'pre-wrap' as const,
  margin: '12px 0',
}

const divider = {
  borderColor: '#E5E5E5',
  margin: '24px 0',
}

const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '500' as const,
}
