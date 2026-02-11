/**
 * Generate room background images for the "View on Wall" feature using DALL-E 3.
 *
 * Usage: node scripts/generate-room-images.mjs
 *
 * Requires OPENAI_API_KEY in .env.local
 * Generates 1792x1024 backgrounds + 240x135 thumbnails in public/rooms/
 */

import OpenAI from 'openai'
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ROOMS_DIR = resolve(ROOT, 'public', 'rooms')

// Load .env.local
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  }
}

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not found in .env.local')
  process.exit(1)
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT_PREFIX =
  'A photorealistic interior room scene suitable for displaying fine art photography on the wall. The scene should be a frontal view of a wall with good lighting, no artwork on the wall, clean and elegant. The perspective should be straight-on, showing the wall prominently in the upper two-thirds and floor in the lower third. Room style:'

const ROOMS = [
  {
    id: 'gallery-white-cube',
    prompt: 'Minimalist white gallery space with pristine white walls, polished concrete floor, track lighting overhead creating even illumination across the wall. Simple, clean, contemporary art gallery aesthetic.',
  },
  {
    id: 'modern-living-room',
    prompt: 'Modern living room with light gray walls, warm hardwood floors, a mid-century modern sofa in neutral tones visible at the edges. Natural light from a window, clean contemporary design.',
  },
  {
    id: 'museum-space',
    prompt: 'Professional museum gallery with medium gray walls, dark polished floor, dramatic spotlight lighting focused on the center of the wall. Institutional quality, pristine exhibition space.',
  },
  {
    id: 'industrial-loft',
    prompt: 'Industrial loft space with exposed brick wall, high ceilings with visible ductwork, large factory windows letting in natural light, polished concrete floor. Warm, textured, urban aesthetic.',
  },
  {
    id: 'brownstone-parlor',
    prompt: 'Classic brownstone parlor with deep forest green walls, ornate crown molding, rich dark hardwood floors, warm ambient lighting. Traditional New York brownstone interior, elegant and sophisticated.',
  },
  {
    id: 'minimalist-office',
    prompt: 'Clean minimalist home office with crisp white walls, light wood desk visible at the edge, natural light streaming in, cream-colored carpet or light wood floor. Calm, focused workspace.',
  },
  {
    id: 'collectors-study',
    prompt: 'Sophisticated art collector study with deep navy blue walls, built-in dark wood bookshelves partially visible at edges, warm accent lighting from brass fixtures, dark hardwood floor. Rich, moody, intimate.',
  },
  {
    id: 'contemporary-gallery',
    prompt: 'Contemporary art gallery with light warm gray walls, sleek track lighting, smooth light-colored resin floor. Modern, spacious, professional gallery setting with subtle architectural details.',
  },
]

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function generateRoom(room) {
  const bgPath = resolve(ROOMS_DIR, `${room.id}-bg.jpg`)
  const thumbPath = resolve(ROOMS_DIR, `${room.id}-thumb.jpg`)

  // Skip if already generated
  if (existsSync(bgPath) && existsSync(thumbPath)) {
    console.log(`  Skipping ${room.id} (already exists)`)
    return
  }

  console.log(`  Generating: ${room.id}...`)

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `${SYSTEM_PROMPT_PREFIX} ${room.prompt}`,
    n: 1,
    size: '1792x1024',
    quality: 'standard',
    response_format: 'url',
  })

  const imageUrl = response.data?.[0]?.url
  if (!imageUrl) {
    throw new Error(`No image URL returned for ${room.id}`)
  }

  console.log(`  Downloading ${room.id}...`)
  const imageBuffer = await downloadImage(imageUrl)

  // Save background at 1920x1080 (resize from 1792x1024)
  console.log(`  Processing background: ${room.id}...`)
  await sharp(imageBuffer)
    .resize(1920, 1080, { fit: 'cover' })
    .jpeg({ quality: 82 })
    .toFile(bgPath)

  // Create thumbnail at 240x135
  console.log(`  Creating thumbnail: ${room.id}...`)
  await sharp(imageBuffer)
    .resize(240, 135, { fit: 'cover' })
    .jpeg({ quality: 75 })
    .toFile(thumbPath)

  console.log(`  Done: ${room.id}`)
}

async function main() {
  console.log('Room Background Image Generator')
  console.log('================================')
  console.log(`Output directory: ${ROOMS_DIR}`)
  console.log(`Rooms to generate: ${ROOMS.length}\n`)

  for (const room of ROOMS) {
    try {
      await generateRoom(room)
    } catch (err) {
      console.error(`  ERROR generating ${room.id}:`, err.message)
      // Continue with other rooms
    }
    // Brief pause between API calls to be respectful of rate limits
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.log('\nDone! All room images generated.')
}

main().catch(console.error)
