#!/usr/bin/env node
/**
 * Generates the six PLACEHOLDER sample sets used to test the site.
 * They are simple procedural artwork, not real wallpapers, and deliberately use
 * different pixel sizes to prove the site does not assume one resolution.
 *
 *   node scripts/generate-samples.mjs           # skips sets whose folder already exists
 *   node scripts/generate-samples.mjs --force   # overwrite them
 *
 * Delete public/wallpapers/001..006 and their wallpapers.json entries once you add real ones.
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ASSET_DIR } from './catalog-shared.mjs';

const force = process.argv.includes('--force');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const star = (cx, cy, r, fill, op = 1) =>
  `<path d="M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r}Z" fill="${fill}" opacity="${op}"/>`;

// Each style returns SVG shapes for a w x h canvas. `v` is 'lock' or 'home'.
const styles = {
  stars(w, h, v) {
    const r = rng(v === 'lock' ? 11 : 12);
    let s = `<defs><radialGradient id="g" cx="50%" cy="${v === 'lock' ? 62 : 45}%" r="70%"><stop offset="0" stop-color="#3a4a78"/><stop offset=".55" stop-color="#121a33"/><stop offset="1" stop-color="#05070f"/></radialGradient>
      <radialGradient id="c" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#e8eefc" stop-opacity=".9"/><stop offset="1" stop-color="#9db4ff" stop-opacity="0"/></radialGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <circle cx="${w / 2}" cy="${h * (v === 'lock' ? 0.62 : 0.72)}" r="${w * 0.32}" fill="url(#c)" opacity=".35"/>`;
    for (let i = 0; i < 70; i++) s += star(r() * w, r() * h, 3 + r() * 14, '#dfe8ff', 0.35 + r() * 0.65);
    for (let i = 0; i < 5; i++) s += star(w * (0.2 + r() * 0.6), h * (0.46 + r() * 0.44), w * (0.05 + r() * 0.05), '#ffffff', 0.95);
    return s;
  },
  horizon(w, h, v) {
    const y = h * (v === 'lock' ? 0.58 : 0.66);
    return `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6efe6"/><stop offset=".6" stop-color="#f2d7c4"/><stop offset="1" stop-color="#e9b99d"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <circle cx="${w / 2}" cy="${y - w * 0.16}" r="${w * 0.16}" fill="#e2735a" opacity=".92"/>
      <rect y="${y}" width="${w}" height="${h - y}" fill="#d9a88c" opacity=".55"/>
      <rect y="${y}" width="${w}" height="3" fill="#b9775c" opacity=".7"/>`;
  },
  pines(w, h, v) {
    const r = rng(v === 'lock' ? 5 : 6);
    let s = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3df"/><stop offset=".55" stop-color="#8fb3ab"/><stop offset="1" stop-color="#3c6a64"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>`;
    const layers = [
      { base: 0.62, size: 0.16, fill: '#a9c7c0', op: 0.8 },
      { base: 0.7, size: 0.22, fill: '#6f9a93', op: 0.9 },
      { base: 0.8, size: 0.3, fill: '#33615b', op: 1 },
      { base: 0.95, size: 0.4, fill: '#173c38', op: 1 },
    ];
    for (const L of layers) {
      s += `<rect y="${h * L.base}" width="${w}" height="${h}" fill="${L.fill}" opacity="${L.op}"/>`;
      for (let x = -w * 0.05; x < w * 1.05; x += w * (0.07 + r() * 0.05)) {
        const th = h * L.size * (0.6 + r() * 0.6);
        const tw = th * 0.38;
        const by = h * L.base + 6;
        s += `<path d="M${x} ${by - th} L${x + tw} ${by} L${x - tw} ${by}Z" fill="${L.fill}" opacity="${L.op}"/>`;
      }
      s += `<rect y="${h * (L.base - 0.04)}" width="${w}" height="${h * 0.08}" fill="#ffffff" opacity=".10"/>`;
    }
    return s;
  },
  grid(w, h, v) {
    let s = `<defs><radialGradient id="g" cx="50%" cy="${v === 'lock' ? 35 : 60}%" r="75%"><stop offset="0" stop-color="#20103f"/><stop offset="1" stop-color="#050509"/></radialGradient>
      <linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>`;
    const gap = w / 9;
    s += `<g stroke="url(#l)" stroke-width="2" opacity=".35">`;
    for (let x = 0; x <= w; x += gap) s += `<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`;
    for (let y = 0; y <= h; y += gap) s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`;
    s += `</g><circle cx="${w * 0.5}" cy="${h * (v === 'lock' ? 0.7 : 0.4)}" r="${w * 0.4}" fill="#7a5cff" opacity=".18"/>
      <circle cx="${w * 0.5}" cy="${h * (v === 'lock' ? 0.7 : 0.4)}" r="${w * 0.18}" fill="none" stroke="url(#l)" stroke-width="6" opacity=".9"/>`;
    return s;
  },
  orbs(w, h, v) {
    const orbs = v === 'lock'
      ? [[0.3, 0.3, 0.2, '#ff8ab3', '#7b2ff7'], [0.72, 0.5, 0.26, '#7ee8ff', '#2a5bd7'], [0.35, 0.74, 0.16, '#ffd37a', '#ef5b5b']]
      : [[0.7, 0.3, 0.2, '#ff8ab3', '#7b2ff7'], [0.3, 0.55, 0.26, '#7ee8ff', '#2a5bd7'], [0.65, 0.8, 0.16, '#ffd37a', '#ef5b5b']];
    let s = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1b2f"/><stop offset="1" stop-color="#3b2d63"/></linearGradient>
      <filter id="b"><feGaussianBlur stdDeviation="${w * 0.02}"/></filter></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>`;
    orbs.forEach(([x, y, r, c1, c2], i) => {
      const cx = w * x, cy = h * y, R = w * r;
      s += `<defs><radialGradient id="o${i}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
        <ellipse cx="${cx}" cy="${cy + R * 1.25}" rx="${R * 0.9}" ry="${R * 0.18}" fill="#000" opacity=".35" filter="url(#b)"/>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#o${i})"/>
        <ellipse cx="${cx - R * 0.3}" cy="${cy - R * 0.4}" rx="${R * 0.32}" ry="${R * 0.18}" fill="#fff" opacity=".55" transform="rotate(-30 ${cx - R * 0.3} ${cy - R * 0.4})"/>`;
    });
    return s;
  },
  moon(w, h, v) {
    const r = rng(v === 'lock' ? 21 : 22);
    const cx = w * 0.5, cy = h * (v === 'lock' ? 0.36 : 0.62), R = w * 0.3;
    let s = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1b3d"/><stop offset="1" stop-color="#2b3a67"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>`;
    for (let i = 0; i < 40; i++) s += `<circle cx="${r() * w}" cy="${r() * h}" r="${1.5 + r() * 3.5}" fill="#fff" opacity="${0.3 + r() * 0.6}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#f4e9c8"/>
      <circle cx="${cx + R * 0.38}" cy="${cy - R * 0.12}" r="${R * 0.92}" fill="#14234a"/>`;
    return s;
  },
};

const SETS = [
  { id: '001', style: 'stars', w: 1290, h: 2796, bg: ['#0b1020', '#27345f'] },
  { id: '002', style: 'horizon', w: 1179, h: 2556, bg: ['#efe4d8', '#e7c3ad'] },
  { id: '003', style: 'pines', w: 1170, h: 2532, bg: ['#cfe0dc', '#7ea39b'] },
  { id: '004', style: 'grid', w: 1284, h: 2778, bg: ['#0a0a14', '#2a1d52'] },
  { id: '005', style: 'orbs', w: 1206, h: 2622, bg: ['#241f3d', '#5a4a8a'] },
  { id: '006', style: 'moon', w: 1080, h: 2400, bg: ['#0d1b3d', '#3a4a7a'] }, // not an iPhone size on purpose
];

const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
const wallpaper = (set, v) => sharp(Buffer.from(svg(set.w, set.h, styles[set.style](set.w, set.h, v) + (v === 'home' ? `<rect width="${set.w}" height="${set.h}" fill="#000" opacity=".14"/>` : ''))));

// --- iPhone-style mockup used as the preview image -------------------------
const PW = 1200, PH = 1500, SW = 392, SH = 850, BZ = 14, RAD = 64;

async function screenWithOverlay(set, v) {
  const buf = await wallpaper(set, v).resize(SW, SH, { fit: 'cover' }).png().toBuffer();
  let overlay;
  if (v === 'lock') {
    overlay = `<text x="${SW / 2}" y="190" text-anchor="middle" font-family="Inter, sans-serif" font-size="30" font-weight="600" fill="#fff" opacity=".85">Tuesday, 6 October</text>
      <text x="${SW / 2}" y="300" text-anchor="middle" font-family="Inter, sans-serif" font-size="128" font-weight="700" fill="#fff" opacity=".92">9:41</text>
      <circle cx="58" cy="${SH - 70}" r="26" fill="#000" opacity=".35"/><circle cx="${SW - 58}" cy="${SH - 70}" r="26" fill="#000" opacity=".35"/>`;
  } else {
    let icons = '';
    for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
      icons += `<rect x="${28 + col * 86}" y="${120 + row * 108}" width="66" height="66" rx="16" fill="#fff" opacity="${0.16 + ((row + col) % 3) * 0.05}"/>`;
    }
    for (let col = 0; col < 4; col++) icons += `<rect x="${28 + col * 86}" y="${SH - 120}" width="66" height="66" rx="16" fill="#fff" opacity=".22"/>`;
    overlay = icons;
  }
  const mask = svg(SW, SH, `<rect width="${SW}" height="${SH}" rx="${RAD - BZ}" fill="#fff"/>`);
  const withOverlay = await sharp(buf)
    .composite([{ input: Buffer.from(svg(SW, SH, overlay)) }, { input: Buffer.from(svg(SW, SH, `<rect x="${SW / 2 - 56}" y="14" width="112" height="32" rx="16" fill="#000"/>`)) }])
    .png().toBuffer();
  return sharp(withOverlay).composite([{ input: Buffer.from(mask), blend: 'dest-in' }]).png().toBuffer();
}

async function makePreview(set) {
  const phones = [{ x: 120, y: 380, v: 'lock' }, { x: 668, y: 250, v: 'home' }];
  const bw = SW + BZ * 2, bh = SH + BZ * 2;
  let base = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${set.bg[0]}"/><stop offset="1" stop-color="${set.bg[1]}"/></linearGradient>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="28"/></filter></defs>
    <rect width="${PW}" height="${PH}" fill="url(#bg)"/>`;
  for (const p of phones) {
    base += `<rect x="${p.x + 10}" y="${p.y + 40}" width="${bw}" height="${bh}" rx="${RAD}" fill="#000" opacity=".45" filter="url(#sh)"/>
      <rect x="${p.x}" y="${p.y}" width="${bw}" height="${bh}" rx="${RAD}" fill="#0c0c0e"/>
      <rect x="${p.x + 1.5}" y="${p.y + 1.5}" width="${bw - 3}" height="${bh - 3}" rx="${RAD - 1.5}" fill="none" stroke="#4a4a50" stroke-width="3"/>`;
  }
  const layers = [];
  for (const p of phones) layers.push({ input: await screenWithOverlay(set, p.v), left: p.x + BZ, top: p.y + BZ });
  return sharp(Buffer.from(svg(PW, PH, base))).composite(layers).jpeg({ quality: 88 });
}

for (const set of SETS) {
  const dir = path.join(ASSET_DIR, set.id);
  if (existsSync(dir) && !force) {
    console.log(`skip ${set.id} (exists; use --force to overwrite)`);
    continue;
  }
  mkdirSync(dir, { recursive: true });
  await wallpaper(set, 'lock').jpeg({ quality: 90 }).toFile(path.join(dir, 'lockscreen.jpg'));
  await wallpaper(set, 'home').jpeg({ quality: 90 }).toFile(path.join(dir, 'homescreen.jpg'));
  await (await makePreview(set)).toFile(path.join(dir, 'preview.jpg'));
  console.log(`made ${set.id} (${set.w}x${set.h})`);
}
