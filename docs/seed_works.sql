-- ============================================
-- Kwame Brathwaite Archive - Works (Artworks) Seed Data
-- Generated: 2026-03-28
-- Source: kwamebrathwaite.com/artworks/ screenshots
-- ============================================
--
-- Run this in the Supabase SQL Editor.
-- image_url is set to a placeholder; update via admin panel.
-- ============================================

INSERT INTO artworks (
  title, year, medium, dimensions, description,
  image_url, category, series, availability_status,
  is_featured, display_order, status, metadata
) VALUES

-- === #1 ===
(
  'Untitled (Miles Davis and Paul Chambers at RIJF)',
  NULL,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'Jazz', 'inquiry_only',
  false, 1, 'published',
  '{"catalog_number": "AJASS_Loc_59_001", "print_year": 2018, "edition": "#1/5 (Ed. 5 + 2AP)", "year_approximate": true, "year_note": "N.D."}'
),

-- === #2 ===
(
  'Untitled (Alvin Ailey)',
  NULL,
  'Archival pigment print, mounted and framed',
  '40 x 30 in (101.6 x 76.2 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 2, 'published',
  '{"print_year": null, "edition": "#1/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "N.D."}'
),

-- === #3 ===
(
  'Untitled (Cannonball Adderley, Great Northern Hotel. Listening to Playback)',
  NULL,
  'Archival pigment print, framed',
  '15 x 15 in (38.1 x 38.1 cm)',
  'Cannonball Adderley listening to playback, Harlem, ca. 1962. Kwame Brathwaite''s earliest photographs are those he took in jazz clubs in New York City...',
  '/images/placeholder.jpg',
  'photography', 'Jazz', 'inquiry_only',
  false, 3, 'published',
  '{"catalog_number": "Adderly_Cannonball_Loc_1A_001", "print_year": 2018, "edition": "#3/10 (Ed. of 10)", "year_approximate": true, "year_note": "Early 60s c."}'
),

-- === #4 ===
(
  'Untitled (Grace Jones Photoshoot)',
  NULL,
  'Archival pigment print, mounted and framed',
  '40 x 30 in (101.6 x 76.2 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 4, 'published',
  '{"print_year": 2018, "edition": "#3/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1980s c."}'
),

-- === #5 ===
(
  'Marley at Soundcheck',
  1975,
  'Archival pigment print, mounted and framed',
  '40 x 30 in (101.6 x 76.2 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 5, 'published',
  '{"catalog_number": "MARLEY_Loc_12_034", "print_year": 2018, "edition": "#2/5 (Ed. 5 + 2AP)", "year_approximate": false, "year_note": "1975 (Oct 4)", "exact_date": "1975-10-04"}'
),

-- === #6 ===
(
  'Untitled (From Left Righteous Brothers, David Bowie, Yoko Ono, John Lennon, Roberta Flack)',
  1975,
  'Archival pigment print, mounted and framed with Optium plexi',
  '40 x 60 in (101.6 x 152.4 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 6, 'published',
  '{"print_year": 2018, "edition": "#2/3 (Ed. of 3 + 2AP)", "year_approximate": false, "year_note": "1975 (Mar 1)", "exact_date": "1975-03-01"}'
),

-- === #7 ===
(
  'Untitled (Crowd at Human Kindness Day)',
  1975,
  'Archival pigment print, mounted and framed',
  '40 x 27 1/2 in (101.6 x 69.8 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 7, 'published',
  '{"catalog_number": "HumanKindnessDay_DC_1_021", "print_year": 2021, "edition": "#2/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1975 c."}'
),

-- === #8 ===
(
  'Untitled (Ali Training for Foreman Fight)',
  1974,
  'Archival pigment print, mounted and framed',
  '30 x 40 in (76.2 x 101.6 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 8, 'published',
  '{"catalog_number": "Ali_Muhammad_Loc_1A_001", "print_year": 2018, "edition": "#1/10 (Ed. of 10)", "year_approximate": true, "year_note": "1974 c."}'
),

-- === #9 ===
(
  'Untitled (Jacksons on Boat from Goree Island)',
  1974,
  'Archival pigment print, mounted and framed',
  '40 x 60 in (101.6 x 152.4 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 9, 'published',
  '{"catalog_number": "Jackson5_Loc_1_010", "print_year": 2018, "edition": "#1/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1974 c."}'
),

-- === #10 ===
(
  'Untitled (Nina Simone at Beacon Theater)',
  1974,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 10, 'published',
  '{"print_year": 2018, "edition": "#1/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1974 c."}'
),

-- === #11 ===
(
  'Ali, Gray Day on the Congo',
  1974,
  'Archival pigment print, mounted and framed',
  '40 x 60 in (101.6 x 152.4 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 11, 'published',
  '{"print_year": 2017, "edition": "#2/3 (Ed. of 3 + 2AP)", "year_approximate": true, "year_note": "1974 c."}'
),

-- === #12 ===
(
  'Changing Times',
  1973,
  'Archival pigment print, mounted and framed with Optium Museum Acrylic',
  '60 x 60 in (152.4 x 152.4 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 12, 'published',
  '{"catalog_number": "AJASS_159_001", "print_year": 2021, "edition": "#1/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1973 c."}'
),

-- === #13 ===
(
  'Untitled (Independence Day)',
  1973,
  'Archival pigment print, mounted and framed',
  '40 x 60 in (101.6 x 152.4 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 13, 'published',
  '{"catalog_number": "IndependenceDay_1_001", "print_year": 2021, "edition": "#1/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1973 c."}'
),

-- === #14 ===
(
  'Revolutionary Movement',
  1972,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 14, 'published',
  '{"catalog_number": "AJASS_159_003", "print_year": 2021, "edition": "#1/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1972 c."}'
),

-- === #15 ===
(
  'Untitled (Portrait, Reels as Necklace)',
  1972,
  'Archival pigment print, framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 15, 'published',
  '{"catalog_number": "004_Bin_077_ID_007", "print_year": 2021, "edition": "#1/10 (Ed. of 5)", "year_approximate": true, "year_note": "1972 c."}'
),

-- === #16 ===
(
  'Untitled (Couple''s Embrace)',
  1971,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 16, 'published',
  '{"catalog_number": "001_Bin_045_ID_005", "print_year": 2021, "edition": "#1/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1971 c."}'
),

-- === #17 ===
(
  'Untitled (Hands in the Shape of a Unity Symbol)',
  1971,
  'Archival pigment print, mounted and framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 17, 'published',
  '{"catalog_number": "006_Bin_002_ID_009", "print_year": 2021, "edition": "#1/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1971 c."}'
),

-- === #18 ===
(
  'Untitled (AJASS Model Multiple Exposure)',
  NULL,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 18, 'published',
  '{"catalog_number": "AJASS_Loc_158_002", "print_year": 2019, "edition": "#3/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1970s c."}'
),

-- === #19 ===
(
  'Untitled (AJASS Model on Black Background)',
  NULL,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 19, 'published',
  '{"catalog_number": "AJASS_Loc_158_001", "print_year": 2019, "edition": "#4/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1970s c."}'
),

-- === #20 ===
(
  'Untitled (White Dress)',
  NULL,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 20, 'published',
  '{"catalog_number": "AJASS_Loc_153_005", "print_year": 2019, "edition": "#2/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1970s c."}'
),

-- === #21 ===
(
  'Untitled (Dap)',
  1970,
  'Archival pigment print, mounted and framed, 3-part',
  '15 x 15 in each / 47 x 15 in installed (38.1 x 38.1 cm / 119.4 x 38.1 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 21, 'published',
  '{"print_year": 2021, "edition": "#3/10 (Ed. of 10)", "year_approximate": true, "year_note": "1970 c.", "is_triptych": true, "individual_dimensions": "15 x 15 in", "installed_dimensions": "47 x 15 in"}'
),

-- === #22 ===
(
  'Untitled (Woman with Pearls)',
  1970,
  'Archival pigment print, mounted and framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 22, 'published',
  '{"catalog_number": "04_Bin_007_ID_001", "print_year": 2021, "edition": "#1/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1970 c."}'
),

-- === #23 ===
(
  'Untitled (Black Is Beautiful Poster from 1970)',
  1970,
  'Archival pigment print, mounted and framed',
  '60 x 47 1/2 in (152.4 x 120.7 cm)',
  'Black Is Beautiful poster, with Brathwaite''s wife, Sikolo, and daughter, Ndola, in the K, ca. 1970. Designed by Bob Gumbs. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019.',
  '/images/placeholder.jpg',
  'photography', 'Black Is Beautiful', 'inquiry_only',
  true, 23, 'published',
  '{"print_year": 2018, "edition": "#3/5 (Ed. 5 + 2AP)", "year_approximate": true, "year_note": "1970 c."}'
),

-- === #24 ===
(
  'Untitled (Model Who Embraced Natural Hairstyles at AJASS Photoshoot)',
  1970,
  'Archival pigment print, mounted and framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  'Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019. Foggatt, Tyler. "Showcase by Kwame Brathwaite," The New Yorker, March 18, 2019.',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 24, 'published',
  '{"print_year": 2018, "edition": "#2/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1970 c."}'
),

-- === #25 ===
(
  'Untitled (Ethel Parks at AJASS Studios Photoshoot)',
  1969,
  'Archival pigment print, framed',
  '15 x 15 in (38.1 x 38.1 cm)',
  'Provenance: The Kwame Brathwaite Archive; Philip Martin Gallery, Los Angeles. Exhibitions: "A Brilliant Spectrum: Recent Gifts of Color Photography," Santa Barbara Museum of Art, January 27 - May 5, 2019. "Black Is Beautiful: The Photography of Kwame Brathwaite," traveling exhibition (multiple institutions, catalog). Kwame Brathwaite: Celebrity and the Everyday, curated by Jesse Williams and Kwame S. Brathwaite, Philip Martin Gallery, Los Angeles, CA, November 18, 2018 - January 12, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 25, 'published',
  '{"catalog_number": "AJASS_Loc_57_006", "print_year": 2018, "edition": "#3/10 (Ed. of 10 + 1AP)", "year_approximate": true, "year_note": "1969 c."}'
),

-- === #26 ===
(
  'Untitled (Grandassas in Car)',
  1968,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 26, 'published',
  '{"catalog_number": "AJASS_38_007", "print_year": 2021, "edition": "#4/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1968 c."}'
),

-- === #27 ===
(
  'Untitled (Charles Peaker Street Speaker, Head of ANPM After Carlos Cooks Passed Away, on 125th Street)',
  1968,
  'Archival pigment print, framed',
  '15 x 15 in (38.1 x 38.1 cm)',
  'Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 27, 'published',
  '{"catalog_number": "AJASS_Loc_27_001", "print_year": 2016, "edition": "#3/10 (Ed. of 10)", "year_approximate": true, "year_note": "1968 c."}'
),

-- === #28 ===
(
  'Untitled (Naturally ''68 Photo Shoot in the Apollo Theater Featuring Grandassa Models and Founding AJASS Members Kletus Smith, Frank Adu, Bob Gumbs, Elombe Brath and Ernest Baxter)',
  1968,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 28, 'published',
  '{"catalog_number": "AJASS_Loc_2_001", "print_year": 2016, "edition": "#3/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1968 c."}'
),

-- === #29 ===
(
  'Untitled (Sikolo Brathwaite at AJASS Studios)',
  1968,
  'Archival pigment print',
  '15 x 15 in (38.1 x 38.1 cm)',
  'Exhibitions: "A Brilliant Spectrum: Recent Gifts of Color Photography," Santa Barbara Museum of Art, Santa Barbara, CA, January 27 - May 5, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 29, 'published',
  '{"catalog_number": "AJASS_Loc_43_007", "print_year": 2016, "edition": "#4/10 (Ed. of 10)", "year_approximate": true, "year_note": "1968 c."}'
),

-- === #30 ===
(
  'Mer',
  1968,
  NULL,
  NULL,
  'Copyright The Artist',
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 30, 'published',
  '{"edition": "Edition of 10", "year_approximate": false, "year_note": "1968"}'
),

-- === #31 ===
(
  'Untitled (African Market, Harlem)',
  1967,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'African Market, Harlem, ca. 1967. Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 31, 'published',
  '{"catalog_number": "AJASS_Loc_121_005", "print_year": 2019, "edition": "#2/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1967 c."}'
),

-- === #32 ===
(
  'Untitled (The Fly Shop)',
  1967,
  'Archival pigment print, mounted and framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  'The Fly Shop was owned by AJASS friend Tamu (last name unknown). Elaine Baskin Bey, who is still a clothing and jewelry designer, worked out of the shop and the... Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 32, 'published',
  '{"catalog_number": "AJASS_Loc_121_004", "print_year": 2019, "edition": "#1/5 (Ed of 5 + 2AP)", "year_approximate": true, "year_note": "1967 c."}'
),

-- === #33 ===
(
  'Untitled (Abbey Lincoln and Dancer)',
  1965,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Provenance: "Changing Times," Philip Martin Gallery, Los Angeles, CA, October 2 - November 13, 2021.',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 33, 'published',
  '{"catalog_number": "AJASS_127_004", "print_year": 2021, "edition": "#3/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1965 c."}'
),

-- === #34 ===
(
  'Untitled (Original AJASS Members L to R: Robert Gumbs, Frank Adu, Elombe Brath (Seated), Kwame Brathwaite, Ernest Baxter & Chris Hall)',
  1965,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Original AJASS members, left to right: Bob Gumbs, Frank Adu, Elombe Brath (seated), Kwame Brathwaite, Ernest Baxter, and Chris Hall. AJASS, Harlem, ca. 1962. Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 34, 'published',
  '{"catalog_number": "AJASS_Loc_27_008", "print_year": 2018, "edition": "#2/5 (Ed. 5 + 2AP)", "year_approximate": true, "year_note": "1965 c."}'
),

-- === #35 ===
(
  'Untitled (Brenda Deaver at AJASS Studios)',
  1965,
  'Archival pigment print, mounted and framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  'Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 35, 'published',
  '{"catalog_number": "AJASS_Loc_41_008", "print_year": 2017, "edition": "#1/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1965 c."}'
),

-- === #36 ===
(
  'Untitled (Michaux''s Books)',
  1964,
  'Archival pigment print, mounted and framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  'We see man dozing, perhaps after a long day at work. He sits across the street from Michaux''s African National Memorial Bookstore - the ''House of Common Sense and Home...''',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 36, 'published',
  '{"catalog_number": "AJASS_Loc_122_002", "print_year": 2020, "edition": "#1/5 (Ed. 5 + 2AP)", "year_approximate": true, "year_note": "1964 c."}'
),

-- === #37 ===
(
  'Untitled (Miles Davis with Speed Bag, Harry Wiley''s Training Gym)',
  1964,
  'Archival pigment print, mounted and framed with Optium plexi',
  '60 x 60 in (152.4 x 152.4 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', 'Jazz', 'inquiry_only',
  false, 37, 'published',
  '{"catalog_number": "AJASS_Loc_77_02", "print_year": 2020, "edition": "#1/5 (Ed. of 5 + 2 AP)", "year_approximate": true, "year_note": "1964 c."}'
),

-- === #38 ===
(
  'Untitled (Nomsa Brath with Earrings Designed by Carolee Prince)',
  1964,
  'Archival pigment print, mounted and framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  'Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019.',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 38, 'published',
  '{"catalog_number": "AJASS_Loc_36_003", "print_year": 2016, "edition": "#1/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1964 c."}'
),

-- === #39 ===
(
  'Untitled (Nomsa Brath Modeling Congolese Fabrics, Stern''s Department Store, New York)',
  1963,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Nomsa Brath modeling Congolese fabrics, Stern''s department store, New York, ca. 1963. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 39, 'published',
  '{"catalog_number": "AJASS_Loc_13_007", "print_year": 2019, "edition": "#1/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1963 c."}'
),

-- === #40 ===
(
  'Untitled (Riis Beach with Jimmy, Kwame and Elombe)',
  1963,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 40, 'published',
  '{"catalog_number": "AJASS_Loc_35_010", "print_year": 2018, "edition": "#1/5 (Ed. 5 + 2AP)", "year_approximate": true, "year_note": "1963 c."}'
),

-- === #41 ===
(
  'Untitled (Clara Lewis Buggs with Yellow Flower)',
  1962,
  'Archival pigment print, framed',
  '15 x 15 in (38.1 x 38.1 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 41, 'published',
  '{"print_year": 2020, "edition": "#7/10 (Ed. of 10)", "year_approximate": true, "year_note": "1962 c."}'
),

-- === #42 ===
(
  'Untitled (Jazz Quartet, Harlem)',
  1961,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  'Miles Davis and Paul Chambers, Randall''s Island Jazz Festival, ca. 1958. Exhibitions: "Black Is Beautiful: The Photography of Kwame Brathwaite," at Skirball Cultural Center, Los Angeles, CA, April 11 - September 1, 2019. Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'Jazz', 'inquiry_only',
  false, 42, 'published',
  '{"catalog_number": "AJASS_Loc_105_003", "print_year": 2019, "edition": "#2/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1961 c."}'
),

-- === #43 ===
(
  'Untitled (James Brown)',
  NULL,
  'Archival pigment print, mounted and framed',
  '30 x 30 in (76.2 x 76.2 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 43, 'published',
  '{"print_year": 2018, "edition": "#1/5 (Ed. of 5 + 2AP)", "year_approximate": true, "year_note": "1960s c."}'
),

-- === #44 ===
(
  'Untitled (Patrons at an AJASS Concert, Club 845, Bronx)',
  1956,
  'Archival pigment print, framed',
  '15 x 15 in (38.1 x 38.1 cm)',
  'Patrons at an AJASS concert, Club 845, Bronx, ca. 1956-57. In contrast to the single figures to the left, this engaging photograph demonstrated Kwame Brathwaite''s talent in depicting people in... Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 44, 'published',
  '{"catalog_number": "AJASS_Loc_82_009", "print_year": 2019, "edition": "#2/10 (Ed. of 10)", "year_approximate": true, "year_note": "1956-57 c."}'
),

-- === #45 ===
(
  'Untitled (Carolee Prince Wearing Her Own Designs)',
  1964,
  'Archival pigment print, mounted and framed',
  '60 x 60 in (152.4 x 152.4 cm)',
  'Literature: Ford, Tanisha. "Kwame Brathwaite: Black is Beautiful," Aperture, New York, NY, 133pp., May 2019',
  '/images/placeholder.jpg',
  'photography', 'AJASS', 'inquiry_only',
  false, 45, 'published',
  '{"catalog_number": "AJASS_Loc_32_010", "print_year": 2018, "edition": "#1/5 (Ed. 5 + 2AP)", "year_approximate": true, "year_note": "1964 c."}'
),

-- === #46 ===
(
  'Untitled (Ali in Ring)',
  1974,
  'Archival pigment print, mounted and framed',
  '60 x 40 in (152.4 x 101.6 cm)',
  NULL,
  '/images/placeholder.jpg',
  'photography', NULL, 'inquiry_only',
  false, 46, 'published',
  '{"print_year": 2018, "edition": "#1/5 (Ed of 5 + 2AP)", "year_approximate": true, "year_note": "1974 c."}'
);
