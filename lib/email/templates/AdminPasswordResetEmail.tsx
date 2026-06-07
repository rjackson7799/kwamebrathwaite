import { Text, Link, Section, Hr } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface AdminPasswordResetEmailProps {
  /** Reset link built from supabase.auth.admin.generateLink({ type: 'recovery' }) */
  actionLink: string
}

export function AdminPasswordResetEmail({
  actionLink,
}: AdminPasswordResetEmailProps) {
  return (
    <BaseLayout previewText="Reset your Kwame Brathwaite Archive admin password">
      <Text style={eyebrow}>
        The Kwame Brathwaite Archive &nbsp;·&nbsp; Admin
      </Text>

      <Text style={heading}>Reset your password</Text>

      <Text style={paragraph}>Hello,</Text>

      <Text style={paragraph}>
        Use the link below to reset your admin password. It is valid for a
        limited time and can be used once.
      </Text>

      <Section style={buttonWrap}>
        <Link href={actionLink} style={button}>
          Reset password
        </Link>
      </Section>

      <Text style={smallNote}>
        If you didn&rsquo;t request this, you can safely ignore this email —
        your password will not change unless you click the link above and set a
        new one.
      </Text>

      <Hr style={divider} />

      <Text style={paragraph}>The Kwame Brathwaite Archive</Text>
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
