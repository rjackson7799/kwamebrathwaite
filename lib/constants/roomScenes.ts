/**
 * Room scene definitions for the "View on a Wall" feature.
 * Each scene represents a curated room environment where artwork can be visualized.
 */

export interface RoomScene {
  id: string
  /** Translation key under works.detail.rooms */
  name: string
  /** Path to thumbnail image (240x135) */
  thumbnail: string
  /** Path to full-size background (1920x1080) */
  background: string
  /** Draggable wall region as percentages of the container */
  wallRegion: {
    top: number
    bottom: number
    left: number
    right: number
  }
  /** CSS gradient fallback when image fails to load */
  gradient: string
  /** Optional radial gradient overlay for spotlight effect */
  spotlightEffect?: string
  /** True for AI-generated rooms added at runtime */
  isCustom?: boolean
}

export const ROOM_SCENES: RoomScene[] = [
  {
    id: 'gallery-white-cube',
    name: 'galleryWhiteCube',
    thumbnail: '/rooms/gallery-white-cube-thumb.jpg',
    background: '/rooms/gallery-white-cube-bg.jpg',
    wallRegion: { top: 0.05, bottom: 0.70, left: 0.05, right: 0.95 },
    gradient:
      'linear-gradient(180deg, #F5F5F5 0%, #F5F5F5 70%, #C4A77D 70%, #8B7355 100%)',
  },
  {
    id: 'modern-living-room',
    name: 'modernLivingRoom',
    thumbnail: '/rooms/modern-living-room-thumb.jpg',
    background: '/rooms/modern-living-room-bg.jpg',
    wallRegion: { top: 0.05, bottom: 0.65, left: 0.10, right: 0.90 },
    gradient:
      'linear-gradient(180deg, #EDEDED 0%, #EDEDED 65%, #B89B78 65%, #7A6548 100%)',
  },
  {
    id: 'museum-space',
    name: 'museumSpace',
    thumbnail: '/rooms/museum-space-thumb.jpg',
    background: '/rooms/museum-space-bg.jpg',
    wallRegion: { top: 0.05, bottom: 0.72, left: 0.05, right: 0.95 },
    gradient:
      'linear-gradient(180deg, #E8E8E8 0%, #E8E8E8 72%, #4A4A4A 72%, #2A2A2A 100%)',
    spotlightEffect:
      'radial-gradient(ellipse 50% 70% at 50% 35%, rgba(255,255,255,0.12) 0%, transparent 70%)',
  },
  {
    id: 'industrial-loft',
    name: 'industrialLoft',
    thumbnail: '/rooms/industrial-loft-thumb.jpg',
    background: '/rooms/industrial-loft-bg.jpg',
    wallRegion: { top: 0.05, bottom: 0.68, left: 0.08, right: 0.92 },
    gradient:
      'linear-gradient(180deg, #A0826D 0%, #A0826D 68%, #5C4033 68%, #3B2820 100%)',
  },
  {
    id: 'brownstone-parlor',
    name: 'brownstoneParlor',
    thumbnail: '/rooms/brownstone-parlor-thumb.jpg',
    background: '/rooms/brownstone-parlor-bg.jpg',
    wallRegion: { top: 0.08, bottom: 0.68, left: 0.10, right: 0.90 },
    gradient:
      'linear-gradient(180deg, #4A5D4A 0%, #4A5D4A 68%, #3A2820 68%, #2A1A12 100%)',
  },
  {
    id: 'minimalist-office',
    name: 'minimalistOffice',
    thumbnail: '/rooms/minimalist-office-thumb.jpg',
    background: '/rooms/minimalist-office-bg.jpg',
    wallRegion: { top: 0.05, bottom: 0.65, left: 0.10, right: 0.90 },
    gradient:
      'linear-gradient(180deg, #F0F0F0 0%, #F0F0F0 65%, #D4C5B0 65%, #A89880 100%)',
  },
  {
    id: 'collectors-study',
    name: 'collectorsStudy',
    thumbnail: '/rooms/collectors-study-thumb.jpg',
    background: '/rooms/collectors-study-bg.jpg',
    wallRegion: { top: 0.08, bottom: 0.68, left: 0.10, right: 0.90 },
    gradient:
      'linear-gradient(180deg, #2C3E50 0%, #2C3E50 68%, #1A1A1A 68%, #0A0A0A 100%)',
    spotlightEffect:
      'radial-gradient(ellipse 60% 80% at 50% 40%, rgba(255,255,255,0.15) 0%, transparent 70%)',
  },
  {
    id: 'contemporary-gallery',
    name: 'contemporaryGallery',
    thumbnail: '/rooms/contemporary-gallery-thumb.jpg',
    background: '/rooms/contemporary-gallery-bg.jpg',
    wallRegion: { top: 0.05, bottom: 0.70, left: 0.05, right: 0.95 },
    gradient:
      'linear-gradient(180deg, #D3D3D3 0%, #D3D3D3 70%, #4A4A4A 70%, #2A2A2A 100%)',
  },
]

/** Default room scene ID */
export const DEFAULT_ROOM_ID = 'gallery-white-cube'

/** Find a room scene by ID, falling back to the default */
export function getRoomScene(id: string): RoomScene {
  return ROOM_SCENES.find((s) => s.id === id) ?? ROOM_SCENES[0]
}
