import { Text, Link, Section, Hr } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface FounderMagicLinkEmailProps {
  /** Durable bridge link minted by createFounderInviteLink (30-day, multi-use) */
  actionLink: string
  /** Full name from the founders row. Falls back to a generic salutation. */
  fullName?: string | null
}

export function FounderMagicLinkEmail({
  actionLink,
  fullName,
}: FounderMagicLinkEmailProps) {
  return (
    <BaseLayout previewText="Your sign-in link for the Founders Circle">
      <Text style={eyebrow}>
        The Kwame Brathwaite Archive &nbsp;·&nbsp; Founders Circle
      </Text>

      <Text style={heading}>Your sign-in link</Text>

      <Text style={paragraph}>
        {fullName ? `Dear ${fullName},` : 'Hello,'}
      </Text>

      <Text style={paragraph}>
        Use the link below to sign in to the Founders Circle. It works for
        30 days and can be used more than once &mdash; feel free to come back
        to this email whenever you&rsquo;d like to sign in.
      </Text>

      <Section style={buttonWrap}>
        <Link href={actionLink} style={button}>
          Sign in
        </Link>
      </Section>

      <Text style={smallNote}>
        If you didn&rsquo;t request this link, you can safely ignore this
        message. No sign-in happens without the link being clicked.
      </Text>

      <Hr style={divider} />

      <Text style={paragraph}>
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
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#1A1A1A',
  margin: '16px 0',
}

const buttonWrap = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0e0e0e',
  color: '#C9A961',
  padding: '16px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '13px',
  fontWeight: '500' as const,
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  border: '1px solid #C9A961',
}

const smallNote = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#6B6B6B',
  margin: '16px 0',
}

const divider = {
  borderColor: '#E5E5E5',
  margin: '32px 0',
}
