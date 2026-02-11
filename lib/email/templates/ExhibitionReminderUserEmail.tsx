import { Text, Section } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface ExhibitionReminderUserEmailProps {
  name: string
  exhibitionTitle: string
  exhibitionVenue: string | null
  exhibitionCity: string | null
  exhibitionCountry: string | null
  exhibitionStartDate: string | null
  exhibitionEndDate: string | null
  reminderType: 'opening' | 'closing' | 'both'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ExhibitionReminderUserEmail(props: ExhibitionReminderUserEmailProps) {
  const location = [props.exhibitionCity, props.exhibitionCountry]
    .filter(Boolean)
    .join(', ')

  const reminderText =
    props.reminderType === 'both'
      ? 'before the opening and before the closing'
      : props.reminderType === 'opening'
        ? 'before the opening'
        : 'before the closing'

  return (
    <BaseLayout previewText={`Exhibition reminder set: ${props.exhibitionTitle}`}>
      <Text style={heading}>Reminder Set</Text>

      <Text style={paragraph}>Dear {props.name},</Text>

      <Text style={paragraph}>
        Thank you for your interest. We will send you a reminder {reminderText}{' '}
        of:
      </Text>

      <Section style={exhibitionBox}>
        <Text style={exhibitionTitle}>{props.exhibitionTitle}</Text>
        {props.exhibitionVenue && (
          <Text style={exhibitionDetail}>{props.exhibitionVenue}</Text>
        )}
        {location && <Text style={exhibitionDetail}>{location}</Text>}
        {props.exhibitionStartDate && props.exhibitionEndDate && (
          <Text style={exhibitionDetail}>
            {formatDate(props.exhibitionStartDate)} &ndash;{' '}
            {formatDate(props.exhibitionEndDate)}
          </Text>
        )}
      </Section>

      <Text style={paragraph}>We look forward to seeing you there.</Text>

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

const exhibitionBox = {
  backgroundColor: '#F5F5F5',
  padding: '24px',
  borderRadius: '4px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const exhibitionTitle = {
  fontSize: '20px',
  fontWeight: '400' as const,
  color: '#000000',
  marginBottom: '12px',
  fontFamily: '"Playfair Display", Georgia, serif',
}

const exhibitionDetail = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6B6B6B',
  margin: '4px 0',
}
