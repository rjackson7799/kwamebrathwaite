import { Text, Section, Link, Hr } from '@react-email/components'
import { BaseLayout } from './BaseLayout'
import { EMAIL_CONFIG } from '../client'

interface LicensingRequestAdminEmailProps {
  name: string
  email: string
  company: string | null
  phone: string | null
  requestNumber: string
  licenseType: string
  territory: string | null
  duration: string | null
  printRun: string | null
  usageDescription: string
  artworkCount: number
  locale: string
}

export function LicensingRequestAdminEmail(props: LicensingRequestAdminEmailProps) {
  const adminUrl = `${EMAIL_CONFIG.siteUrl}/admin/licensing`

  return (
    <BaseLayout previewText={`New licensing request: ${props.requestNumber}`}>
      <Text style={heading}>New Licensing Request</Text>

      <Section style={detailsBox}>
        <Text style={detailsHeading}>Request Details</Text>
        <Text style={detailsText}>
          <strong>Request Number:</strong> {props.requestNumber}
        </Text>
        <Text style={detailsText}>
          <strong>License Type:</strong> {props.licenseType}
        </Text>
        <Text style={detailsText}>
          <strong>Artworks:</strong> {props.artworkCount} images
        </Text>
        {props.territory && (
          <Text style={detailsText}>
            <strong>Territory:</strong> {props.territory}
          </Text>
        )}
        {props.duration && (
          <Text style={detailsText}>
            <strong>Duration:</strong> {props.duration}
          </Text>
        )}
        {props.printRun && (
          <Text style={detailsText}>
            <strong>Print Run:</strong> {props.printRun}
          </Text>
        )}
      </Section>

      <Hr style={divider} />

      <Section style={detailsBox}>
        <Text style={detailsHeading}>Contact Information</Text>
        <Text style={detailsText}>
          <strong>Name:</strong> {props.name}
        </Text>
        <Text style={detailsText}>
          <strong>Email:</strong> {props.email}
        </Text>
        {props.company && (
          <Text style={detailsText}>
            <strong>Company:</strong> {props.company}
          </Text>
        )}
        {props.phone && (
          <Text style={detailsText}>
            <strong>Phone:</strong> {props.phone}
          </Text>
        )}
        <Text style={detailsText}>
          <strong>Locale:</strong> {props.locale}
        </Text>
      </Section>

      <Hr style={divider} />

      <Section>
        <Text style={detailsHeading}>Usage Description</Text>
        <Text style={usageText}>{props.usageDescription}</Text>
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

const usageText = {
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
