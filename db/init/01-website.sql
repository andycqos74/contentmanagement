-- Sample "website" database: represents the club site's own DB that data-driven
-- widgets read from (read-only). Runs once on first container init.
CREATE DATABASE IF NOT EXISTS website
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Read-only user for data-driven widget connections (SELECT only).
CREATE USER IF NOT EXISTS 'website_ro'@'%' IDENTIFIED BY 'readonly';
GRANT SELECT ON website.* TO 'website_ro'@'%';
FLUSH PRIVILEGES;

USE website;

CREATE TABLE IF NOT EXISTS posts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  slug         VARCHAR(255),
  excerpt      TEXT,
  body         TEXT,
  image_url    VARCHAR(512),
  category     VARCHAR(100),
  status       VARCHAR(20)  NOT NULL DEFAULT 'published',
  published_at DATETIME,
  url          VARCHAR(512)
);

INSERT INTO posts (title, slug, excerpt, image_url, category, status, published_at, url) VALUES
 ('Queens seal dramatic late win at Palmerston', 'late-win-palmerston',
  'A stoppage-time strike sealed all three points in front of a jubilant home crowd.',
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&q=80',
  'Match Report', 'published', '2026-07-20 17:05:00', 'https://www.qosfc.com/news/late-win-palmerston'),
 ('Guthrie signs one-year contract extension', 'guthrie-extension',
  'The striker has committed his future to the club for another season.',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=800&q=80',
  'Club News', 'published', '2026-07-18 10:30:00', 'https://www.qosfc.com/news/guthrie-extension'),
 ('Season tickets now on sale for 2026/27', 'season-tickets-on-sale',
  'Secure your seat at Palmerston Park with early-bird pricing available until August.',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80',
  'Tickets', 'published', '2026-07-15 09:00:00', 'https://www.qosfc.com/news/season-tickets-on-sale'),
 ('Youth academy open trials announced', 'academy-trials',
  'Aspiring young players are invited to register for this summer''s open trials.',
  'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800&q=80',
  'Academy', 'published', '2026-07-12 14:00:00', 'https://www.qosfc.com/news/academy-trials'),
 ('Premier Sports Cup group draw confirmed', 'cup-draw',
  'Queens learn their group-stage opponents for the upcoming cup campaign.',
  'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=800&q=80',
  'Fixtures', 'published', '2026-07-10 12:00:00', 'https://www.qosfc.com/news/cup-draw'),
 ('New home kit unveiled ahead of new season', 'home-kit-launch',
  'The classic royal blue returns with a modern twist for the 2026/27 campaign.',
  'https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?w=800&q=80',
  'Club News', 'published', '2026-07-08 11:00:00', 'https://www.qosfc.com/news/home-kit-launch'),
 ('DRAFT: Pre-season friendly review (unpublished)', 'draft-friendly',
  'This item is a draft and should not appear in published widgets.',
  NULL, 'Match Report', 'draft', '2026-07-05 16:00:00', NULL);
