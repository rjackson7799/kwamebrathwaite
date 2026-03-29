-- ============================================
-- Kwame Brathwaite Archive - Past Exhibition Seed Data
-- Generated: 2026-03-28
-- Source: kwamebrathwaite.com/exhibitions/ screenshots
-- ============================================
--
-- All exhibitions here have ended before 2026-03-28.
-- These are ADDITIONAL past exhibitions not in seed_exhibitions.sql
-- (except Camera and the City which is already there).
--
-- Run this in the Supabase SQL Editor AFTER seed_exhibitions.sql,
-- or merge into seed_exhibitions.sql as needed.
-- ============================================

INSERT INTO exhibitions (
  slug, title, venue, city, state_region, country,
  start_date, end_date, exhibition_type, venue_url,
  display_order, status
) VALUES

-- === ROW 1 (from screenshots) ===
-- Camera and the City — already in seed_exhibitions.sql, skipping

(
  'giants-virginia-museum-of-fine-arts',
  'GIANTS: Art from the Dean Collection of Swizz Beatz and Alicia Keys',
  'Virginia Museum of Fine Arts',
  'Richmond', 'VA', 'United States',
  '2025-11-22', '2026-03-01', 'past',
  NULL,
  100, 'published'
),
(
  'giving-you-the-best-that-i-got',
  'Giving You the Best That I Got',
  'Art + Practice',
  'Los Angeles', 'CA', 'United States',
  '2025-10-11', '2026-03-07', 'past',
  NULL,
  101, 'published'
),
(
  'photography-and-the-black-arts-movement-nga',
  'Photography and the Black Arts Movement, 1955–1985',
  'National Gallery of Art',
  'Washington', 'DC', 'United States',
  '2025-09-21', '2026-01-11', 'past',
  NULL,
  102, 'published'
),

-- === ROW 2 ===
(
  'black-photojournalism-carnegie',
  'Black Photojournalism',
  'Carnegie Museum of Art',
  'Pittsburgh', 'PA', 'United States',
  '2025-09-13', '2026-01-19', 'past',
  NULL,
  103, 'published'
),
(
  'kwame-brathwaite-black-is-beautiful-mougins',
  'Kwame Brathwaite: Black Is Beautiful',
  'Mougins Center of Photography',
  'Mougins', NULL, 'France',
  '2025-07-04', '2026-01-18', 'past',
  NULL,
  104, 'published'
),
(
  'language-and-image-perez-art-museum',
  'Language and Image: Conceptual and Performance Based Photography from the Jorge M. Perez Collection',
  'Perez Art Museum Miami',
  'Miami', 'FL', 'United States',
  '2025-05-15', '2026-01-11', 'past',
  NULL,
  105, 'published'
),
(
  'kwame-brathwaite-the-1970s',
  'Kwame Brathwaite the 1970s',
  'Arkansas Museum of Art',
  'Little Rock', 'AR', 'United States',
  '2025-04-19', '2025-10-12', 'past',
  NULL,
  106, 'published'
),

-- === ROW 3 ===
(
  'disco-im-coming-out-paris',
  'I''m Coming Out',
  'Philharmonie de Paris',
  'Paris', NULL, 'France',
  '2025-02-14', '2025-08-17', 'past',
  NULL,
  107, 'published'
),
(
  'project-a-black-planet-chicago',
  'Project a Black Planet: The Art and Culture of Panafrica',
  'Art Institute of Chicago',
  'Chicago', 'IL', 'United States',
  '2024-12-14', '2025-03-22', 'past',
  NULL,
  108, 'published'
),
(
  'representing-art-beyond-the-color-line',
  'Re/Presenting: Art Beyond the Color Line',
  'Amherst College',
  'Amherst', 'MA', 'United States',
  '2024-11-12', '2025-07-06', 'past',
  NULL,
  109, 'published'
),
(
  'giants-high-museum',
  'GIANTS: Art from the Dean Collection of Swizz Beatz and Alicia Keys',
  'The High Museum',
  'Atlanta', 'GA', 'United States',
  '2024-09-13', '2025-01-19', 'past',
  NULL,
  110, 'published'
),

-- === ROW 4 ===
(
  'before-you-now-cal-state-northridge',
  'Before You Now: Capturing the Self in Portraiture',
  'Cal State Northridge',
  'Northridge', 'CA', 'United States',
  '2024-08-31', '2024-12-07', 'past',
  NULL,
  111, 'published'
),
(
  'kwame-brathwaite-things-well-worth-waiting-for-artcenter',
  'Kwame Brathwaite: Things Well Worth Waiting For',
  'Art Center College of Design',
  'Pasadena', 'CA', 'United States',
  '2024-04-17', '2024-08-17', 'past',
  NULL,
  112, 'published'
),
(
  'giants-brooklyn-museum',
  'GIANTS: The Dean Collection',
  'Brooklyn Museum',
  'Brooklyn', 'NY', 'United States',
  '2024-02-10', '2024-07-07', 'past',
  NULL,
  113, 'published'
),
(
  'kwame-brathwaite-things-well-worth-waiting-for-chicago',
  'Kwame Brathwaite: Things Well Worth Waiting For',
  'Art Institute of Chicago',
  'Chicago', 'IL', 'United States',
  '2023-02-25', '2023-07-24', 'past',
  NULL,
  114, 'published'
),

-- === ROW 5 ===
(
  'pocket-universe-philip-martin',
  'Pocket Universe',
  'Philip Martin Gallery',
  'Los Angeles', 'CA', 'United States',
  '2023-02-14', '2023-03-11', 'past',
  NULL,
  115, 'published'
),
(
  'its-time-vielmetter',
  'It''s Time: Kwame Brathwaite, Kwesi Botchway, Genevieve Gaignard, Rodney McMillan, Wangechi Mutu, Paul Mpagi Sepuya',
  'Vielmetter',
  'Los Angeles', 'CA', 'United States',
  '2023-01-14', '2023-02-25', 'past',
  NULL,
  116, 'published'
),
(
  'a-time-of-gifts-santa-barbara',
  'A Time of Gifts',
  'Santa Barbara Museum of Art',
  'Santa Barbara', 'CA', 'United States',
  '2022-10-16', '2023-01-15', 'past',
  NULL,
  117, 'published'
),
(
  'black-is-beautiful-nyhs',
  'Black Is Beautiful: The Photography of Kwame Brathwaite',
  'New York Historical Society',
  'New York', 'NY', 'United States',
  '2022-08-19', '2023-01-15', 'past',
  NULL,
  118, 'published'
),

-- === ROW 6 ===
(
  'black-is-beautiful-reynolda-house',
  'Black Is Beautiful: The Photography of Kwame Brathwaite',
  'Reynolda House',
  'Winston-Salem', 'NC', 'United States',
  '2022-02-05', '2022-05-08', 'past',
  NULL,
  119, 'published'
),
(
  'this-tender-fragile-thing',
  'This Tender, Fragile Thing',
  'Jack Shainman Gallery - The School',
  'Kinderhook', 'NY', 'United States',
  '2022-01-15', '2022-04-30', 'past',
  NULL,
  120, 'published'
),
(
  'black-american-portraits-lacma',
  'Black American Portraits',
  'LACMA',
  'Los Angeles', 'CA', 'United States',
  '2021-11-07', '2022-04-17', 'past',
  NULL,
  121, 'published'
),
(
  'changing-times-philip-martin',
  'Changing Times',
  'Philip Martin Gallery',
  'Los Angeles', 'CA', 'United States',
  '2021-10-02', '2021-11-13', 'past',
  NULL,
  122, 'published'
),

-- === ROW 7 ===
(
  'facing-forward-santa-barbara',
  'Facing Forward: Photographic Portraits from SBMA',
  'Santa Barbara Museum of Art',
  'Santa Barbara', 'CA', 'United States',
  '2021-08-15', '2021-12-19', 'past',
  NULL,
  123, 'published'
),
(
  'voices-of-fashion-centraal-museum',
  'Voices of Fashion: Black Couture, Beauty & Styles',
  'Centraal Museum',
  'Utrecht', NULL, 'Netherlands',
  '2021-06-05', '2021-08-15', 'past',
  NULL,
  124, 'published'
),
(
  'the-struggle-continues-philip-martin',
  'The Struggle Continues, Victory Is Certain',
  'Philip Martin Gallery',
  'Los Angeles', 'CA', 'United States',
  '2020-09-19', '2020-10-09', 'past',
  NULL,
  125, 'published'
);
