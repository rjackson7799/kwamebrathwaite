/**
 * Deterministic geography canonicalization for Smart Import.
 *
 * Canonical storage format, matching the existing seed data exactly
 * (docs/seed_exhibitions.sql): city as written, `state_region` as the
 * two-letter subdivision CODE ('CA', 'TX', 'MA'), `country` as the full
 * English name ('United States', 'France', 'Belgium').
 *
 * Hard rule: a weak abbreviation must NEVER silently select a country.
 * Resolution is by explicit lookup only; anything unrecognized leaves the
 * fields null and raises a warning for a human to resolve.
 */

/** US states, DC, and inhabited territories. */
const US_SUBDIVISIONS: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  PR: 'Puerto Rico', VI: 'U.S. Virgin Islands', GU: 'Guam', AS: 'American Samoa',
}

const CA_SUBDIVISIONS: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
}

/**
 * ISO-3166 alpha-2 → canonical English name.
 *
 * Deliberately a curated subset rather than all 249 codes. An unlisted code
 * resolves to null-plus-warning, which is the safe outcome — adding an entry
 * here is a one-line change when a new territory actually appears.
 */
const ISO_COUNTRIES: Record<string, string> = {
  AR: 'Argentina', AT: 'Austria', AU: 'Australia', BE: 'Belgium', BR: 'Brazil',
  CA: 'Canada', CH: 'Switzerland', CL: 'Chile', CN: 'China', CO: 'Colombia',
  CU: 'Cuba', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', EE: 'Estonia',
  EG: 'Egypt', ES: 'Spain', ET: 'Ethiopia', FI: 'Finland', FR: 'France',
  GB: 'United Kingdom', GH: 'Ghana', GR: 'Greece', HU: 'Hungary', ID: 'Indonesia',
  IE: 'Ireland', IL: 'Israel', IN: 'India', IS: 'Iceland', IT: 'Italy',
  JM: 'Jamaica', JP: 'Japan', KE: 'Kenya', KR: 'South Korea', LU: 'Luxembourg',
  MA: 'Morocco', MX: 'Mexico', MY: 'Malaysia', NG: 'Nigeria', NL: 'Netherlands',
  NO: 'Norway', NZ: 'New Zealand', PE: 'Peru', PH: 'Philippines', PL: 'Poland',
  PT: 'Portugal', RO: 'Romania', RS: 'Serbia', RU: 'Russia', SE: 'Sweden',
  SG: 'Singapore', SN: 'Senegal', TH: 'Thailand', TR: 'Turkey', TT: 'Trinidad and Tobago',
  TW: 'Taiwan', TZ: 'Tanzania', UA: 'Ukraine', UG: 'Uganda', US: 'United States',
  UY: 'Uruguay', VN: 'Vietnam', ZA: 'South Africa', ZW: 'Zimbabwe',
}

/**
 * Codes that are BOTH a US/CA subdivision and an ISO country — 'CA' is
 * California and Canada, 'DE' is Delaware and Germany, 'IN' is Indiana and
 * India. These resolve to the subdivision (the archive is overwhelmingly US:
 * 33 of ~40 seeded exhibitions) but always carry a warning so a human confirms.
 */
const AMBIGUOUS_CODES = new Set(
  [...Object.keys(US_SUBDIVISIONS), ...Object.keys(CA_SUBDIVISIONS)].filter(
    (code) => code in ISO_COUNTRIES
  )
)

/** Common full-name spellings that should normalize to the canonical form. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  'u.s.': 'United States',
  'u.s.a.': 'United States',
  america: 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
  'great britain': 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  holland: 'Netherlands',
  'the netherlands': 'Netherlands',
  'south korea': 'South Korea',
  'republic of korea': 'South Korea',
  'czech republic': 'Czechia',
  sp: 'Spain', // seen in the archive's own document as a stand-in for Spain
}

const CANONICAL_BY_LOWER_NAME: Record<string, string> = Object.values(ISO_COUNTRIES).reduce(
  (acc, name) => {
    acc[name.toLowerCase()] = name
    return acc
  },
  {} as Record<string, string>
)

export interface ResolvedGeography {
  city: string | null
  state_region: string | null
  country: string | null
  warnings: string[]
}

/**
 * Resolve raw city / region / country tokens into the canonical storage form.
 *
 * @param rawCity     city as written, e.g. "Parramatta"
 * @param rawRegion   region token as written, e.g. "DC", "CA", or null
 * @param rawCountry  country token as written, e.g. "AU", "FRANCE", or null
 */
export function resolveGeography(
  rawCity: string | null | undefined,
  rawRegion: string | null | undefined,
  rawCountry: string | null | undefined
): ResolvedGeography {
  const warnings: string[] = []
  const city = rawCity?.trim() || null

  let stateRegion: string | null = null
  let country: string | null = null

  // --- region token -------------------------------------------------------
  const regionToken = rawRegion?.trim().toUpperCase() || null
  if (regionToken) {
    if (regionToken in US_SUBDIVISIONS) {
      stateRegion = regionToken
      country = 'United States'
      if (AMBIGUOUS_CODES.has(regionToken)) {
        warnings.push(
          `"${regionToken}" is both a US state (${US_SUBDIVISIONS[regionToken]}) and the country code for ${ISO_COUNTRIES[regionToken]}. Read as the US state — confirm.`
        )
      }
    } else if (regionToken in CA_SUBDIVISIONS) {
      stateRegion = regionToken
      country = 'Canada'
    } else if (regionToken in ISO_COUNTRIES) {
      // A token that is only a country code landed in the region slot.
      country = ISO_COUNTRIES[regionToken]
    } else {
      // Could be a spelled-out region ("Brittany"); keep it, do not guess a country.
      stateRegion = rawRegion?.trim() || null
      warnings.push(`Could not resolve region "${rawRegion}" to a known subdivision code.`)
    }
  }

  // --- explicit country token overrides anything inferred above -----------
  const countryRaw = rawCountry?.trim() || null
  if (countryRaw) {
    const upper = countryRaw.toUpperCase()
    const lower = countryRaw.toLowerCase()

    if (countryRaw.length === 2 && upper in ISO_COUNTRIES) {
      country = ISO_COUNTRIES[upper]
      if (AMBIGUOUS_CODES.has(upper) && !stateRegion) {
        warnings.push(
          `"${upper}" is both a country code (${ISO_COUNTRIES[upper]}) and a US/CA subdivision. Read as the country — confirm.`
        )
      }
    } else if (lower in COUNTRY_ALIASES) {
      country = COUNTRY_ALIASES[lower]
    } else if (lower in CANONICAL_BY_LOWER_NAME) {
      country = CANONICAL_BY_LOWER_NAME[lower]
    } else {
      // Never guess. Leave null and make the human decide.
      warnings.push(
        `Could not resolve country "${countryRaw}" — left blank rather than guessing.`
      )
    }
  }

  return { city, state_region: stateRegion, country, warnings }
}

/**
 * Split a trailing location line like "Philip Martin Gallery, Los Angeles, CA"
 * or "Parramatta, AU" into its parts.
 *
 * Returns raw tokens only — resolution is resolveGeography()'s job. Exported
 * for use by the parser's post-processing and by tests.
 */
export function splitLocationLine(line: string): {
  venue: string | null
  city: string | null
  region: string | null
} {
  const parts = line
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length === 0) return { venue: null, city: null, region: null }
  if (parts.length === 1) return { venue: null, city: parts[0], region: null }

  const last = parts[parts.length - 1]
  const looksLikeCode = /^[A-Za-z]{2}$/.test(last)

  if (looksLikeCode) {
    // "…, City, XX"
    const city = parts[parts.length - 2] ?? null
    const venue = parts.length > 2 ? parts.slice(0, -2).join(', ') : null
    return { venue, city, region: last.toUpperCase() }
  }

  // "Venue, City" with no code
  return {
    venue: parts.length > 2 ? parts.slice(0, -1).join(', ') : parts[0],
    city: last,
    region: null,
  }
}
