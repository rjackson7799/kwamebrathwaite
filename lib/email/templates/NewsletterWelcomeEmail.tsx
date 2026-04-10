import { Text, Link } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface NewsletterWelcomeEmailProps {
  unsubscribeUrl?: string
}

export function NewsletterWelcomeEmail({ unsubscribeUrl }: NewsletterWelcomeEmailProps = {}) {
  return (
    <BaseLayout previewText="Welcome to the Kwame Brathwaite Archive newsletter">
      <Text style={heading}>Welcome</Text>

      <Text style={paragraph}>
        Thank you for subscribing to updates from the Kwame Brathwaite Photo
        Archive.
      </Text>

      <Text style={paragraph}>
        You will receive occasional updates about new exhibitions, press
        coverage, archival discoveries, and other news related to the
        groundbreaking work of photographer Kwame Brathwaite and the Black is
        Beautiful movement.
      </Text>

      <Text style={paragraph}>
        We respect your inbox and will only send meaningful updates.
      </Text>

      <Text style={paragraph}>
        Best regards,
        <br />
        Kwame Brathwaite Archive
      </Text>

      {unsubscribeUrl && (
        <Text style={unsubscribeText}>
          You are receiving this email because you subscribed to the Kwame
          Brathwaite Archive newsletter. If you no longer wish to receive these
          updates, you can{' '}
          <Link href={unsubscribeUrl} style={unsubscribeLink}>
            unsubscribe here
          </Link>
          .
        </Text>
      )}
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

const unsubscribeText = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6B6B6B',
  marginTop: '32px',
  paddingTop: '16px',
  borderTop: '1px solid #E5E5E5',
}

const unsubscribeLink = {
  color: '#6B6B6B',
  textDecoration: 'underline',
}
