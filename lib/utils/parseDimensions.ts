/**
 * Parses artwork dimension strings into structured data
 * Handles formats like "20 × 24 inches", "50.8 × 61 cm", "30 x 40 in"
 */

export interface ParsedDimensions {
  width: number
  height: number
  unit: 'inches' | 'cm'
}

/**
 * Parse a dimension string into width, height, and unit
 * @param dimensionString - String like "20 × 24 inches" or "50.8 × 61 cm"
 * @returns ParsedDimensions object or null if unparseable
 */
export function parseDimensions(dimensionString: string | null | undefined): ParsedDimensions | null {
  if (!dimensionString) return null

  // Handle formats: "20 × 24 inches", "50.8 × 61 cm", "30 x 40 in"
  // The × character is Unicode multiply sign, also handle lowercase x
  const regex = /([\d.]+)\s*[×x]\s*([\d.]+)\s*(inches?|in|cm)/i
  const match = dimensionString.match(regex)

  if (!match) return null

  const [, widthStr, heightStr, unitStr] = match
  const width = parseFloat(widthStr)
  const height = parseFloat(heightStr)

  // Validate parsed numbers
  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    return null
  }

  const unit = unitStr.toLowerCase().includes('cm') ? 'cm' : 'inches'

  return {
    width,
    height,
    unit,
  }
}

/**
 * Convert dimensions to inches
 * @param dimensions - ParsedDimensions object
 * @returns Dimensions in inches
 */
export function toInches(dimensions: ParsedDimensions): { width: number; height: number } {
  if (dimensions.unit === 'inches') {
    return { width: dimensions.width, height: dimensions.height }
  }
  // Convert cm to inches (1 inch = 2.54 cm)
  return {
    width: dimensions.width / 2.54,
    height: dimensions.height / 2.54,
  }
}
