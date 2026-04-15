import { Html, Head, Preview, Body, Container, Text } from '@react-email/components'

interface PlainMessageEmailProps {
  body: string
  previewText?: string
}

/**
 * Minimal email template for outreach messages — no Brathwaite branding,
 * so the email reads as a personal note from the sender. Paragraph breaks
 * in the body string (\n\n) become separate <Text> blocks.
 */
export function PlainMessageEmail({ body, previewText }: PlainMessageEmailProps) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <Html>
      <Head />
      <Preview>{previewText || paragraphs[0]?.slice(0, 120) || ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={text}>
              {p}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
}
const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
}
const text = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#222222',
  margin: '0 0 16px',
  whiteSpace: 'pre-wrap' as const,
}
