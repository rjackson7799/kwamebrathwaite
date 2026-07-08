import { Text, Link, Section, Hr } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface FounderInvitationEmailProps {
  /** Durable bridge link minted by createFounderInviteLink (30-day, multi-use) */
  actionLink: string
  /** Full name from the founders row, used for the salutation. */
  fullName: string
  /** Optional personal note from the admin who issued the invitation. */
  personalNote?: string | null
  /**
   * Display name for the staff member who sent the invitation. Accepted for
   * backwards compatibility but no longer rendered — the invitation is signed
   * by Kwame Brathwaite Jr.
   */
  invitedByName?: string | null
}

export function FounderInvitationEmail({
  actionLink,
  fullName,
  personalNote,
}: FounderInvitationEmailProps) {
  return (
    <BaseLayout previewText="Your invitation to the Founders Circle">
      <Text style={eyebrow}>
        The Kwame Brathwaite Archive &nbsp;·&nbsp; Founders Circle
      </Text>

      <Text style={heading}>You&rsquo;re invited.</Text>

      <Text style={paragraph}>Dear {fullName},</Text>

      <Text style={paragraph}>
        It is our privilege to invite you to the Founders Circle of the
        Kwame Brathwaite Archive — an invitation-only opportunity to support the
        archive and collect an unreleased special-edition print. The link below
        signs you in to your invitation, where you can review the terms and make
        your contribution.
      </Text>

      {personalNote ? (
        <Section style={noteBox}>
          <Text style={noteLabel}>A note from the team</Text>
          <Text style={noteText}>{personalNote}</Text>
        </Section>
      ) : null}

      <Section style={buttonWrap}>
        <Link href={actionLink} style={button}>
          Enter the Founders Circle
        </Link>
      </Section>

      <Text style={smallNote}>
        This link works for 30 days and can be used more than once &mdash;
        return to this email anytime. If it ever stops working, you can
        request a fresh link from the sign-in page.
      </Text>

      <Hr style={divider} />

      <Text style={paragraph}>
        With Gratitude,
        <br />
        Kwame Brathwaite Jr.
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
  fontSize: '32px',
  fontWeight: '400' as const,
  color: '#000000',
  marginBottom: '24px',
  fontFamily: '"Playfair Display", Georgia, serif',
  lineHeight: '36px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#1A1A1A',
  margin: '16px 0',
}

const noteBox = {
  borderLeft: '3px solid #C9A961',
  backgroundColor: '#FAF6EC',
  padding: '16px 20px',
  margin: '24px 0',
}

const noteLabel = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: '#8a6f2b',
  margin: '0 0 8px 0',
}

const noteText = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#1A1A1A',
  margin: '0',
  fontStyle: 'italic' as const,
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
