import { Text, Link, Section, Hr } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface FounderBriefingNotificationEmailProps {
  /** Founder's full_name (or recognition_name) for the salutation. */
  fullName: string
  /** Briefing title — already translated to the founder's preferred_locale by the caller. */
  title: string
  /** Optional excerpt — already translated. */
  excerpt?: string | null
  /** Absolute URL to /founders/portal/briefings/[id] in the founder's locale. */
  readUrl: string
}

export function FounderBriefingNotificationEmail({
  fullName,
  title,
  excerpt,
  readUrl,
}: FounderBriefingNotificationEmailProps) {
  return (
    <BaseLayout previewText={`A new briefing from the archive: ${title}`}>
      <Text style={eyebrow}>
        The Kwame Brathwaite Archive &nbsp;·&nbsp; Founder&rsquo;s Circle
      </Text>

      <Text style={heading}>A new briefing from the archive.</Text>

      <Text style={paragraph}>Dear {fullName},</Text>

      <Text style={paragraph}>
        We&rsquo;ve published a new briefing in your member space.
      </Text>

      <Section style={noteBox}>
        <Text style={noteTitle}>{title}</Text>
        {excerpt ? <Text style={noteText}>{excerpt}</Text> : null}
      </Section>

      <Section style={buttonWrap}>
        <Link href={readUrl} style={button}>
          Read the briefing
        </Link>
      </Section>

      <Text style={smallNote}>
        Sign in to your Founder&rsquo;s Circle space to read this and any
        previous briefings in the archive&rsquo;s permanent record.
      </Text>

      <Hr style={divider} />

      <Text style={paragraph}>
        With gratitude,
        <br />
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
  padding: '20px 24px',
  margin: '24px 0',
}

const noteTitle = {
  fontSize: '20px',
  fontWeight: '500' as const,
  lineHeight: '28px',
  color: '#1A1A1A',
  margin: '0 0 8px 0',
  fontFamily: '"Playfair Display", Georgia, serif',
}

const noteText = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#3A3A3A',
  margin: '0',
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
