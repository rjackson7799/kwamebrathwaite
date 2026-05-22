import { Text, Link, Button, Section } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface NewsletterConfirmEmailProps {
  confirmUrl: string
}

export function NewsletterConfirmEmail({ confirmUrl }: NewsletterConfirmEmailProps) {
  return (
    <BaseLayout previewText="Confirm your subscription to the Kwame Brathwaite Archive newsletter">
      <Text style={heading}>One more step</Text>

      <Text style={paragraph}>
        Please confirm your subscription to updates from the Kwame Brathwaite
        Photo Archive by clicking the button below.
      </Text>

      <Section style={buttonWrapper}>
        <Button href={confirmUrl} style={button}>
          Confirm subscription
        </Button>
      </Section>

      <Text style={paragraph}>
        If the button does not work, copy and paste this link into your
        browser:
      </Text>
      <Text style={linkFallback}>
        <Link href={confirmUrl} style={linkText}>
          {confirmUrl}
        </Link>
      </Text>

      <Text style={smallParagraph}>
        If you did not sign up, you can safely ignore this email — no
        subscription will be created until you confirm.
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

const smallParagraph = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6B6B6B',
  marginTop: '32px',
  paddingTop: '16px',
  borderTop: '1px solid #E5E5E5',
}

const buttonWrapper = {
  textAlign: 'left' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '500' as const,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  padding: '14px 28px',
  display: 'inline-block',
}

const linkFallback = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6B6B6B',
  wordBreak: 'break-all' as const,
  margin: '8px 0 0 0',
}

const linkText = {
  color: '#6B6B6B',
  textDecoration: 'underline',
}
