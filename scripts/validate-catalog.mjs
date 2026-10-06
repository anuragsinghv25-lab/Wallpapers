#!/usr/bin/env node
/**
 * Validates src/data/wallpapers.json and the files in public/wallpapers/.
 * Exits with code 1 (failing the build) if anything is wrong.
 */
import { existsSync, readdirSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import path from 'node:path';
import {
  WALLPAPERS_JSON, CATEGORIES_JSON, ASSET_DIR, REQUIRED_FILES, readJson, slugFor,
} from './catalog-shared.mjs';

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isRealDate = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

function looksLikeJpeg(file) {
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.alloc(3);
    readSync(fd, buf, 0, 3, 0);
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  } finally {
    closeSync(fd);
  }
}

// --- categories -------------------------------------------------------------
let categories = [];
try {
  categories = readJson(CATEGORIES_JSON);
  if (!Array.isArray(categories) || categories.length === 0) {
    err('categories.json must be a non-empty array.');
    categories = [];
  }
} catch (e) {
  err(e.message);
}
const categoryNames = new Set();
const categorySlugs = new Set();
categories.forEach((c, i) => {
  const where = `categories.json[${i}]`;
  if (!isNonEmptyString(c?.name)) return err(`${where}: "name" is required.`);
  if (!isNonEmptyString(c?.slug)) return err(`${where} (${c.name}): "slug" is required.`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug)) err(`${where} (${c.name}): slug "${c.slug}" must be lowercase letters, numbers and hyphens.`);
  if (categoryNames.has(c.name)) err(`${where}: duplicate category name "${c.name}".`);
  if (categorySlugs.has(c.slug)) err(`${where}: duplicate category slug "${c.slug}".`);
  categoryNames.add(c.name);
  categorySlugs.add(c.slug);
});

// --- wallpapers -------------------------------------------------------------
let wallpapers = [];
try {
  wallpapers = readJson(WALLPAPERS_JSON);
  if (!Array.isArray(wallpapers)) {
    err('wallpapers.json must be an array of wallpaper entries.');
    wallpapers = [];
  }
} catch (e) {
  err(e.message);
}

const seenIds = new Map();
const seenSlugs = new Map();

wallpapers.forEach((w, i) => {
  const label = isNonEmptyString(w?.id) ? `Wallpaper "${w.id}"` : `wallpapers.json[${i}]`;

  if (typeof w !== 'object' || w === null || Array.isArray(w)) {
    return err(`${label}: entry must be an object.`);
  }

  // Required metadata
  const missing = ['id', 'title', 'category', 'tags', 'featured', 'added'].filter((k) => !(k in w));
  if (missing.length) err(`${label}: missing required field(s): ${missing.join(', ')}.`);

  // id
  if ('id' in w) {
    if (!isNonEmptyString(w.id)) err(`${label}: "id" must be a non-empty string (e.g. "007").`);
    else if (!/^[A-Za-z0-9_-]+$/.test(w.id)) err(`${label}: "id" may only contain letters, numbers, "-" and "_" (it is the folder name).`);
    else if (seenIds.has(w.id)) err(`${label}: duplicate id "${w.id}" (also at index ${seenIds.get(w.id)}).`);
    else seenIds.set(w.id, i);
  }

  // title
  if ('title' in w && !isNonEmptyString(w.title)) err(`${label}: "title" must be a non-empty string.`);

  // category
  if ('category' in w) {
    if (!isNonEmptyString(w.category)) err(`${label}: "category" must be a non-empty string.`);
    else if (!categoryNames.has(w.category)) {
      err(`${label}: invalid category "${w.category}". Valid categories: ${[...categoryNames].join(', ')}.`);
    }
  }

  // tags
  if ('tags' in w) {
    if (!Array.isArray(w.tags) || !w.tags.every(isNonEmptyString)) err(`${label}: "tags" must be an array of non-empty strings (use [] for none).`);
  }

  // featured
  if ('featured' in w && typeof w.featured !== 'boolean') err(`${label}: "featured" must be true or false.`);

  // added
  if ('added' in w && !(typeof w.added === 'string' && isRealDate(w.added))) err(`${label}: "added" must be a real date formatted YYYY-MM-DD.`);

  // slug uniqueness (derived from the title unless an explicit "slug" is given)
  if (isNonEmptyString(w.title) || isNonEmptyString(w.slug)) {
    const slug = slugFor(w);
    if (!slug) err(`${label}: could not derive a URL slug from the title.`);
    else if (seenSlugs.has(slug)) err(`${label}: URL slug "${slug}" is already used by wallpaper "${seenSlugs.get(slug)}". Change the title or add a unique "slug" field.`);
    else seenSlugs.set(slug, w.id ?? `index ${i}`);
  }

  // files
  if (isNonEmptyString(w.id) && /^[A-Za-z0-9_-]+$/.test(w.id)) {
    const dir = path.join(ASSET_DIR, w.id);
    if (!existsSync(dir)) {
      err(`${label}: folder public/wallpapers/${w.id}/ does not exist.`);
    } else {
      for (const file of REQUIRED_FILES) {
        const full = path.join(dir, file);
        if (!existsSync(full)) err(`${label}: missing file public/wallpapers/${w.id}/${file}`);
        else if (statSync(full).size === 0) err(`${label}: public/wallpapers/${w.id}/${file} is empty.`);
        else if (!looksLikeJpeg(full)) err(`${label}: public/wallpapers/${w.id}/${file} is not a valid JPEG (check the extension and format).`);
      }
    }
  }
});

// Orphaned asset folders: not an error, but worth knowing about.
if (existsSync(ASSET_DIR)) {
  for (const entry of readdirSync(ASSET_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !seenIds.has(entry.name)) {
      warn(`public/wallpapers/${entry.name}/ has no entry in wallpapers.json (it will not appear on the site).`);
    }
  }
}

// --- report -----------------------------------------------------------------
for (const w of warnings) console.warn(`  warning: ${w}`);

if (errors.length) {
  console.error(`\nCatalog validation failed with ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n`);
  for (const e of errors) console.error(`  x ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`Catalog OK: ${wallpapers.length} wallpaper set${wallpapers.length === 1 ? '' : 's'}, ${categories.length} categories.`);
