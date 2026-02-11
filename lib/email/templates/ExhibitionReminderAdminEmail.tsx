import { Text, Section, Link } from '@react-email/components'
import { BaseLayout } from './BaseLayout'
import { EMAIL_CONFIG } from '../client'

interface ExhibitionReminderAdminEmailProps {
  name: string
  email: string
  exhibitionTitle: string
  exhibitionVenue: string | null
  reminderType: 'opening' | 'closing' | 'both'
  locale: string
  source: string | null
}

export function ExhibitionReminderAdminEmail(props: ExhibitionReminderAdminEmailProps) {
  const adminUrl = `${EMAIL_CONFIG.siteUrl}/admin/inquiries`
  const reminderLabel =
    props.reminderType === 'both'
      ? 'Opening & Closing'
      : props.reminderType.charAt(0).toUpperCase() + props.reminderType.slice(1)

  return (
    <BaseLayout previewText={`New exhibition reminder request from ${props.name}`}>
      <Text style={heading}>New Exhibition Reminder Request</Text>

      <Text style={paragraph}>
        Someone has signed up for exhibition reminders.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailsHeading}>Contact Information</Text>
        <Text style={detailsText}>
          <strong>Name:</strong> {props.name}
        </Text>
        <Text style={detailsText}>
          <strong>Email:</strong> {props.email}
        </Text>
      </Section>

      <Section style={detailsBox}>
        <Text style={detailsHeading}>Exhibition Details</Text>
        <Text style={detailsText}>
          <strong>Exhibition:</strong> {props.exhibitionTitle}
        </Text>
        {props.exhibitionVenue && (
          <Text style={detailsText}>
            <strong>Venue:</strong> {props.exhibitionVenue}
          </Text>
        )}
        <Text style={detailsText}>
          <strong>Reminder Type:</strong> {reminderLabel}
        </Text>
        <Text style={detailsText}>
          <strong>Locale:</strong> {props.locale}
        </Text>
        {props.source && (
          <Text style={detailsText}>
            <strong>Source:</strong> {props.source}
          </Text>
        )}
      </Section>

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
