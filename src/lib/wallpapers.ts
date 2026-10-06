/**
 * Turns the raw catalog (wallpapers.json) + build manifest into the objects
 * the pages use. This is the only place that knows the file naming convention.
 */
import wallpapersRaw from '../data/wallpapers.json';
import categoriesRaw from '../data/categories.json';
import manifestRaw from '../generated/manifest.json';
import { slugify } from './slug.js';

export interface Category {
  name: string;
  slug: string;
  description?: string;
}

export interface ImageVariant {
  w: number;
  src: string;
}

export interface SetImage {
  /** Original download file. Never modified. */
  url: string;
  width: number;
  height: number;
  bytes: number;
  /** Small gallery thumbnail of this image. */
  thumb: { src: string; w: number };
}

export interface Wallpaper {
  id: string;
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  tags: string[];
  featured: boolean;
  added: string;
  preview: { width: number; height: number; variants: ImageVariant[]; original: string };
  lockscreen: SetImage;
  homescreen: SetImage;
  /** Any extra fields you add to a wallpapers.json entry are available here. */
  extra: Record<string, unknown>;
}

const KNOWN = new Set(['id', 'slug', 'title', 'category', 'tags', 'featured', 'added']);
const manifest = manifestRaw as Record<string, any>;

export const categories: Category[] = categoriesRaw as Category[];
const categoryByName = new Map(categories.map((c) => [c.name, c]));

function build(entry: any): Wallpaper {
  const m = manifest[entry.id];
  if (!m) throw new Error(`No generated thumbnails for wallpaper "${entry.id}". Run "npm run prepare-catalog".`);
  const base = `/wallpapers/${entry.id}`;
  const category = categoryByName.get(entry.category)!;
  return {
    id: entry.id,
    slug: entry.slug ? String(entry.slug) : slugify(entry.title),
    title: entry.title,
    category: category.name,
    categorySlug: category.slug,
    tags: entry.tags,
    featured: entry.featured,
    added: entry.added,
    preview: { ...m.preview, original: `${base}/preview.jpg` },
    lockscreen: { url: `${base}/lockscreen.jpg`, ...m.lockscreen },
    homescreen: { url: `${base}/homescreen.jpg`, ...m.homescreen },
    extra: Object.fromEntries(Object.entries(entry).filter(([k]) => !KNOWN.has(k))),
  };
}

/** All wallpapers, newest first (ties broken by id, descending). */
export const wallpapers: Wallpaper[] = (wallpapersRaw as any[])
  .map(build)
  .sort((a, b) => b.added.localeCompare(a.added) || b.id.localeCompare(a.id, undefined, { numeric: true }));

export const featured = (limit: number) => wallpapers.filter((w) => w.featured).slice(0, limit);
export const inCategory = (slug: string) => wallpapers.filter((w) => w.categorySlug === slug);
export const countsByCategory = (): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const w of wallpapers) counts.set(w.categorySlug, (counts.get(w.categorySlug) ?? 0) + 1);
  return counts;
};

/** Other wallpapers from the same category, for the "More like this" row. */
export const related = (w: Wallpaper, limit = 6) =>
  wallpapers.filter((o) => o.id !== w.id && o.categorySlug === w.categorySlug).slice(0, limit);

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
