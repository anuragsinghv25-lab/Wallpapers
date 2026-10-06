// Shared by validate-catalog.mjs and make-thumbnails.mjs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { slugify } from '../src/lib/slug.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WALLPAPERS_JSON = path.join(ROOT, 'src/data/wallpapers.json');
export const CATEGORIES_JSON = path.join(ROOT, 'src/data/categories.json');
export const ASSET_DIR = path.join(ROOT, 'public/wallpapers');

/** The fixed file names every wallpaper set must contain. */
export const REQUIRED_FILES = ['preview.jpg', 'lockscreen.jpg', 'homescreen.jpg'];

export function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    const rel = path.relative(ROOT, file);
    throw new Error(`Could not read ${rel}: ${err.message}`);
  }
}

export function slugFor(entry) {
  return entry.slug ? String(entry.slug) : slugify(entry.title ?? '');
}
