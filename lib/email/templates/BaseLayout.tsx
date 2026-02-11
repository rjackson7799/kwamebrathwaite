import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components'
import type { ReactNode } from 'react'

interface BaseLayoutProps {
  children: ReactNode
  previewText: string
}

export function BaseLayout({ children, previewText }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerText}>Kwame Brathwaite Photo Archive</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} Kwame Brathwaite Archive
            </Text>
            <Text style={footerText}>
              <Link
                href="https://www.instagram.com/kwamebrathwaitearchive"
                style={footerLink}
              >
                Instagram
              </Link>
              {' | '}
              <Link
                href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'}/privacy`}
                style={footerLink}
              >
                Privacy Policy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
}

const header = {
  marginBottom: '32px',
  borderBottom: '2px solid #000000',
  paddingBottom: '16px',
}

const headerText = {
  fontSize: '24px',
  fontWeight: '400' as const,
  color: '#000000',
  margin: '0',
  fontFamily: '"Playfair Display", Georgia, serif',
}

const content = {
  marginBottom: '32px',
}

const hr = {
  borderColor: '#E5E5E5',
  margin: '32px 0',
}

const footer = {
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '12px',
  color: '#6B6B6B',
  lineHeight: '20px',
  margin: '4px 0',
}

const footerLink = {
  color: '#000000',
  textDecoration: 'underline',
}
