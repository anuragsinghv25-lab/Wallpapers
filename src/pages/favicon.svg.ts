import { site } from '../config/site';

// Generated from the branding config so the favicon always matches the logo.
export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${site.accent}"/><text x="32" y="44" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="36" font-weight="700" fill="#fff">${site.logoMark}</text></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
