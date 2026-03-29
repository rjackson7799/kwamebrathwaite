-- ============================================
-- Kwame Brathwaite Archive - Exhibition Seed Data
-- Generated: 2026-03-28
-- Source: docs/events.md (2026 Exhibit Schedule)
-- ============================================
--
-- exhibition_type based on 2026-03-28:
--   past    = end_date < today
--   current = start_date <= today AND end_date >= today
--   upcoming = start_date > today
--
-- Run this in the Supabase SQL Editor.
-- ============================================

-- Clear existing exhibitions first
DELETE FROM exhibition_artworks;
DELETE FROM exhibitions;

INSERT INTO exhibitions (
  slug, title, venue, city, state_region, country,
  start_date, end_date, exhibition_type, venue_url,
  display_order, status
) VALUES

-- === PAST ===
(
  'camera-and-the-city',
  'Camera and the City',
  'National Gallery of Canada',
  'Ottawa', 'Ontario', 'Canada',
  '2025-12-12', '2026-03-15', 'past',
  'https://www.gallery.ca/whats-on/exhibitions-and-galleries',
  1, 'published'
),

-- === CURRENT ===
(
  'ideas-of-africa-portraits-and-political-imagination',
  'Ideas of Africa: Portraits and Political Imagination',
  'Museum of Modern Art',
  'New York', 'NY', 'United States',
  '2025-12-14', '2026-04-04', 'current',
  'https://www.moma.org/calendar/exhibitions/5755',
  2, 'published'
),
(
  'as-we-rise-photography-from-the-black-atlantic',
  'As We Rise: Photography from the Black Atlantic',
  'Grand Rapids Art Museum',
  'Grand Rapids', 'MI', 'United States',
  '2025-12-05', '2026-04-06', 'current',
  'https://www.artmuseumgr.org/exhibitions/as-we-rise-photography-from-the-black-atlantic',
  3, 'published'
),
(
  'project-a-black-planet',
  'Project a Black Planet: The Art and Culture of Panafrica',
  'MACBA',
  'Barcelona', NULL, 'Spain',
  '2025-11-06', '2026-04-06', 'current',
  'https://www.macba.cat/en/exhibitions/project-a-black-planet-the-art-and-culture-of-panafrica/',
  4, 'published'
),
(
  'black-is-beautiful-kwame-brathwaite',
  'Black is Beautiful: Kwame Brathwaite',
  'GwinZegal Art Center',
  'Guingamp', 'Brittany', 'France',
  '2026-02-13', '2026-05-31', 'current',
  'https://gwinzegal.com',
  5, 'published'
),
(
  'kwame-brathwaite-revolutionary-movements',
  'Kwame Brathwaite: Revolutionary Movements',
  'Mead Art Museum',
  'Amherst', 'MA', 'United States',
  '2026-02-17', '2026-07-05', 'current',
  'https://www.amherst.edu/museums/mead/exhibitions/2026/kwame-brathwaite-revolutionary-movements',
  6, 'published'
),
(
  'photography-and-the-black-arts-movement',
  'Photography and the Black Arts Movement',
  'J. Paul Getty Museum',
  'Los Angeles', 'CA', 'United States',
  '2026-02-24', '2026-05-24', 'current',
  'https://www.getty.edu/exhibitions/black-arts-movement/',
  7, 'published'
),
(
  'picture-perfect-beauty-through-a-contemporary-lens',
  'Picture Perfect: Beauty through a Contemporary Lens',
  'Bozar Centre for Fine Arts',
  'Brussels', NULL, 'Belgium',
  '2026-03-07', '2026-08-16', 'current',
  'https://www.bozar.be/en/calendar/picture-perfect',
  8, 'published'
),
(
  'black-photojournalism',
  'Black Photojournalism',
  'Amon Carter Museum of American Art',
  'Fort Worth', 'TX', 'United States',
  '2026-03-15', '2026-07-05', 'current',
  'https://www.cartermuseum.org/exhibitions/black-photojournalism',
  9, 'published'
),

-- === UPCOMING ===
(
  'giants-art-from-the-dean-collection',
  'GIANTS: Art from the Dean Collection of Swizz Beatz and Alicia Keys',
  'Museum of Contemporary Art San Diego',
  'San Diego', 'CA', 'United States',
  '2026-04-18', '2026-08-09', 'upcoming',
  'https://mcasd.org/exhibitions/giants',
  10, 'published'
),
(
  'black-fashion-color-and-culture',
  'Black/Fashion: Color and Culture',
  'Museum of Fine Arts',
  'Boston', 'MA', 'United States',
  '2026-09-05', '2027-01-05', 'upcoming',
  NULL,
  11, 'published'
),
(
  'disco-im-coming-out-amsterdam',
  'Disco, I''m Coming Out',
  'Wereldmuseum',
  'Amsterdam', NULL, 'Netherlands',
  '2026-10-09', '2027-08-22', 'upcoming',
  NULL,
  12, 'published'
),
(
  'sunday-best-toronto',
  'Sunday Best',
  'Art Gallery of Ontario',
  'Toronto', 'ON', 'Canada',
  '2026-10-10', '2027-02-28', 'upcoming',
  NULL,
  13, 'published'
),
(
  'bold-and-brilliant-houston',
  'Bold & Brilliant: The Rise of Black Magazines 1930-1970',
  'The Museum of Fine Arts',
  'Houston', 'TX', 'United States',
  '2027-03-07', '2027-05-31', 'upcoming',
  NULL,
  14, 'published'
),
(
  'sunday-best-philadelphia',
  'Sunday Best',
  'Philadelphia Museum of Art',
  'Philadelphia', 'PA', 'United States',
  '2027-04-17', '2027-08-08', 'upcoming',
  NULL,
  15, 'published'
),
(
  'disco-im-coming-out-munich',
  'Disco, I''m Coming Out',
  'Kunsthalle Muenchen',
  'Munich', 'Bavaria', 'Germany',
  '2027-09-17', '2028-02-28', 'upcoming',
  NULL,
  16, 'published'
),
(
  'bold-and-brilliant-portland',
  'Bold & Brilliant: The Rise of Black Magazines 1930-1970',
  'Portland Museum of Art',
  'Portland', 'OR', 'United States',
  '2027-10-08', '2028-01-09', 'upcoming',
  NULL,
  17, 'published'
),
(
  'disco-im-coming-out-antwerp',
  'Disco, I''m Coming Out',
  'MAS - Museum aan de Stroom',
  'Antwerp', NULL, 'Belgium',
  '2028-03-23', '2028-11-05', 'upcoming',
  NULL,
  18, 'published'
);
