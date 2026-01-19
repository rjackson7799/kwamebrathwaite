/**
 * Calculate artwork scale for "View on Wall" feature
 * Converts real-world dimensions to pixel dimensions for display
 */

import { parseDimensions, toInches } from './parseDimensions'

// Room constants
const ROOM_WALL_HEIGHT_INCHES = 96 // 8 feet standard wall height
const CHAIR_HEIGHT_INCHES = 32 // Standard Eames-style chair height
const MIN_ARTWORK_PX = 50 // Minimum artwork size in pixels

export interface ScaledDimensions {
  width: number
  height: number
}

/**
 * Calculate artwork pixel dimensions based on room height
 * @param dimensionString - Artwork dimensions like "20 × 24 inches"
 * @param roomHeightPx - Height of room image in pixels
 * @param roomWallHeightInches - Real wall height in inches (default: 96 = 8 feet)
 * @returns ScaledDimensions or null if dimensions can't be parsed
 */
export function calculateArtworkScale(
  dimensionString: string | null | undefined,
  roomHeightPx: number,
  roomWallHeightInches: number = ROOM_WALL_HEIGHT_INCHES
): ScaledDimensions | null {
  const parsed = parseDimensions(dimensionString)
  if (!parsed) return null

  // Convert to inches if in cm
  const inchDimensions = toInches(parsed)

  // Calculate pixels per inch based on room height
  const pixelsPerInch = roomHeightPx / roomWallHeightInches

  // Calculate pixel dimensions
  let width = inchDimensions.width * pixelsPerInch
  let height = inchDimensions.height * pixelsPerInch

  // Enforce minimum size for very small artworks
  if (width < MIN_ARTWORK_PX || height < MIN_ARTWORK_PX) {
    const scale = MIN_ARTWORK_PX / Math.min(width, height)
    width *= scale
    height *= scale
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  }
}

/**
 * Calculate reference chair height in pixels
 * @param roomHeightPx - Height of room image in pixels
 * @param roomWallHeightInches - Real wall height in inches (default: 96 = 8 feet)
 * @returns Chair height in pixels
 */
export function getChairScale(
  roomHeightPx: number,
  roomWallHeightInches: number = ROOM_WALL_HEIGHT_INCHES
): number {
  const pixelsPerInch = roomHeightPx / roomWallHeightInches
  return Math.round(CHAIR_HEIGHT_INCHES * pixelsPerInch)
}

/**
 * Get artwork position for centering on wall
 * @param artworkWidth - Artwork width in pixels
 * @param artworkHeight - Artwork height in pixels
 * @param containerWidth - Container width in pixels
 * @param containerHeight - Container height in pixels
 * @returns Position object with top and left values
 */
export function getArtworkPosition(
  artworkWidth: number,
  artworkHeight: number,
  containerWidth: number,
  containerHeight: number
): { top: number; left: number } {
  // Center horizontally
  const left = (containerWidth - artworkWidth) / 2

  // Position at eye level (approximately 1/3 from top of wall)
  // This places the center of artwork at about 5 feet high on an 8-foot wall
  const top = containerHeight * 0.3 - artworkHeight / 2

  return {
    top: Math.max(20, top), // Minimum 20px from top
    left: Math.max(0, left),
  }
}
