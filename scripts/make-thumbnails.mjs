#!/usr/bin/env node
/**
 * Builds optimized gallery derivatives from the originals.
 *
 *   public/wallpapers/{id}/*.jpg      originals (never modified, served for downloads)
 *   public/generated/{id}/*.webp      derivatives used by the site (git-ignored)
 *   src/generated/manifest.json       sizes + derivative paths read by the site (git-ignored)
 *
 * Derivative file names contain a hash of the source file, so they can be
 * cached forever and a replaced image automatically gets a new URL.
 * Unchanged images are skipped, so repeat builds are fast.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, WALLPAPERS_JSON, ASSET_DIR, readJson } from './catalog-shared.mjs';

const OUT_DIR = path.join(ROOT, 'public/generated');
const MANIFEST = path.join(ROOT, 'src/generated/manifest.json');

const PREVIEW_WIDTHS = [400, 800, 1200]; // gallery card (400/800) and detail page (800/1200)
const SET_THUMB_WIDTH = 640; // small Lock/Home thumbnails on the detail page
const WEBP = { quality: 80, effort: 4 };
const CONCURRENCY = 4;

const hashOf = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 8);

/** Pixel size as displayed, taking EXIF rotation into account. */
async function displaySize(buf) {
  const { width, height, orientation } = await sharp(buf).metadata();
  return orientation && orientation >= 5 ? { width: height, height: width } : { width, height };
}

async function makeWebp(buf, outFile, width) {
  if (existsSync(outFile)) return;
  await sharp(buf).rotate().resize({ width, withoutEnlargement: true }).webp(WEBP).toFile(outFile);
}

async function processSet(id) {
  const srcDir = path.join(ASSET_DIR, id);
  const outDir = path.join(OUT_DIR, id);
  mkdirSync(outDir, { recursive: true });
  const keep = new Set();
  const url = (file) => `/generated/${id}/${file}`;

  // Preview: several widths for srcset
  const previewBuf = readFileSync(path.join(srcDir, 'preview.jpg'));
  const pHash = hashOf(previewBuf);
  const pSize = await displaySize(previewBuf);
  const widths = [...new Set(PREVIEW_WIDTHS.map((w) => Math.min(w, pSize.width)))];
  const variants = [];
  for (const w of widths) {
    const file = `preview-${pHash}-${w}.webp`;
    keep.add(file);
    await makeWebp(previewBuf, path.join(outDir, file), w);
    variants.push({ w, src: url(file) });
  }

  // Lock Screen and Home Screen: one small thumbnail each + facts about the original
  const entry = { preview: { ...pSize, variants } };
  for (const [key, shortName] of [['lockscreen', 'lock'], ['homescreen', 'home']]) {
    const file = path.join(srcDir, `${key}.jpg`);
    const buf = readFileSync(file);
    const size = await displaySize(buf);
    const w = Math.min(SET_THUMB_WIDTH, size.width);
    const thumbName = `${shortName}-${hashOf(buf)}-${w}.webp`;
    keep.add(thumbName);
    await makeWebp(buf, path.join(outDir, thumbName), w);
    entry[key] = { ...size, bytes: statSync(file).size, thumb: { w, src: url(thumbName) } };
  }

  // Remove stale derivatives left over from replaced images
  for (const f of readdirSync(outDir)) if (!keep.has(f)) rmSync(path.join(outDir, f), { force: true });
  return entry;
}

const wallpapers = readJson(WALLPAPERS_JSON);
const ids = wallpapers.map((w) => w?.id).filter((id) => typeof id === 'string' && existsSync(path.join(ASSET_DIR, id)));

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(path.dirname(MANIFEST), { recursive: true });

const manifest = {};
const started = Date.now();
for (let i = 0; i < ids.length; i += CONCURRENCY) {
  const batch = ids.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(processSet));
  batch.forEach((id, j) => (manifest[id] = results[j]));
}

// Remove derivative folders for sets that no longer exist
for (const entry of readdirSync(OUT_DIR, { withFileTypes: true })) {
  if (entry.isDirectory() && !(entry.name in manifest)) rmSync(path.join(OUT_DIR, entry.name), { recursive: true, force: true });
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`Thumbnails ready for ${ids.length} set${ids.length === 1 ? '' : 's'} (${((Date.now() - started) / 1000).toFixed(1)}s).`);
