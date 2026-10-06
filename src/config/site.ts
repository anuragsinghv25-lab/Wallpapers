/**
 * Single place for branding. Change these values and every page,
 * the logo, the browser title and the favicon follow.
 */
export const site = {
  /** Shown in the header, page titles and the favicon. */
  name: 'Wallpapers',
  /** One or two characters shown in the logo mark and favicon. */
  logoMark: 'W',
  /** Short line under the home page heading. */
  tagline: 'Premium wallpapers for iPhone.',
  /** Default meta description. */
  description:
    'Browse and download free iPhone wallpapers. Every set includes a Lock Screen and a Home Screen wallpaper.',
  /** Accent colour used for the logo mark, favicon and theme-color. */
  accent: '#0a84ff',
  /** How many wallpapers the grid reveals at a time. */
  pageSize: 24,
  /** How many wallpapers appear in the Featured row on the home page. */
  featuredLimit: 10,
} as const;
