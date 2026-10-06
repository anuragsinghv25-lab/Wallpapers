import { defineConfig } from 'astro/config';

// Netlify exposes the production URL as `URL` during builds.
// Used only for canonical links and social previews; the site works without it.
const site = process.env.URL || undefined;

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
