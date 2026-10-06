# Wallpapers

A static, metadata-driven iPhone wallpaper website built with [Astro](https://astro.build). No backend, no database, no accounts.

Each wallpaper **set** has three images: a preview mockup (shown in the gallery), a Lock Screen wallpaper and a Home Screen wallpaper. The Lock Screen and Home Screen files are served exactly as you supply them. They are never resized or modified.

## Run it locally

Requires Node 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:4321
```

Other commands:

```bash
npm run build      # validates the catalog, builds thumbnails, builds the site into dist/
npm run preview    # serves the built site from dist/
npm run validate   # only checks wallpapers.json and the image files
```

`dev` and `build` both run the validator and the thumbnail generator first. If you run `npx astro build` directly, run `npm run prepare-catalog` first.

## Add a wallpaper (no code changes)

1. Create a folder named after the new ID and put the three files in it, using these exact names:

   ```
   public/wallpapers/101/
   ├── preview.jpg       the iPhone mockup shown in the gallery
   ├── lockscreen.jpg    the Lock Screen wallpaper (any pixel size)
   └── homescreen.jpg    the Home Screen wallpaper (any pixel size)
   ```

2. Add one entry to `src/data/wallpapers.json`:

   ```json
   {
     "id": "101",
     "title": "Chrome Stars",
     "category": "Abstract",
     "tags": ["stars", "night", "silver"],
     "featured": false,
     "added": "2026-10-06"
   }
   ```

3. Commit and push. Netlify rebuilds and publishes automatically.

All six fields are required. `category` must match a name in `src/data/categories.json`. `added` is `YYYY-MM-DD` and decides the "Latest" order. You can add extra fields to an entry (for example `"description"`); they are ignored by the validator and available to the code as `wallpaper.extra`.

The page address comes from the title (`Chrome Stars` becomes `/w/chrome-stars/`). If two titles would collide, or you want a fixed address, add a `"slug"` field to the entry.

### What the build checks

The build fails, with a plain message saying what to fix, if:

- an `id` is duplicated, or two entries would have the same page address
- a required field is missing or has the wrong type
- the `category` is not in `categories.json`
- any of the three image files is missing, empty or not a real JPEG

A folder in `public/wallpapers/` with no matching entry only produces a warning.

## Categories

Edit `src/data/categories.json`. Each category needs a `name` (used in `wallpapers.json`), a `slug` (used in the page address) and an optional `description`. Categories with no wallpapers are hidden automatically.

## Branding

Everything about the site's name and look lives in `src/config/site.ts`: site name, logo letter, tagline, description and accent colour. The header, page titles and favicon all follow it.

## How images are handled

| Folder | Contents | In git? |
| --- | --- | --- |
| `public/wallpapers/{id}/` | Your original files, served untouched for downloads | Yes |
| `public/generated/{id}/` | Optimized WebP copies used by the site (400/800/1200 px previews, small Lock/Home thumbnails) | No, built every time |

The gallery only loads the small preview copies, and lazy-loads them. The full-size Lock Screen and Home Screen files are only fetched when someone presses Download. Generated file names contain a hash of the source file, so a replaced image gets a new address and is never served stale.

## Downloads

- **iPhone / iPad:** the original is fetched and shared as a real file with the Web Share API, so the share sheet offers **Save Image** (into Photos). If the browser can't share files, the original opens full size with the instruction "On iPhone: press and hold the image → Save to Photos."
- **Desktop / Android:** a normal download of the original file.
- **No JavaScript:** the buttons are plain links to the original file.

A website cannot set a wallpaper automatically. iOS only allows the user to do that, and the page says so.

## Deploy to Netlify

1. In Netlify choose **Add new site → Import an existing project** and pick this GitHub repository.
2. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, Node 22. Leave everything else as it is.
3. Deploy. Every push to `main` publishes, and pull requests get preview URLs.

No environment variables are needed. Netlify's own `URL` variable is used for canonical links and social previews.

## Sample content

Sets `001` to `006` are generated placeholders (made by `scripts/generate-samples.mjs`) with different pixel sizes, so you can test the whole flow. Delete those folders and their entries in `wallpapers.json` when you add real wallpapers.

## Project layout

```
public/wallpapers/       original images, one folder per set
src/data/                wallpapers.json and categories.json (the source of truth)
src/config/site.ts       branding
src/lib/wallpapers.ts    reads the catalog; the only place that knows the file naming convention
src/pages/               home, category pages, wallpaper pages, 404, favicon
src/components/          card, gallery, search, category chips
src/scripts/             search/"show more" and download behaviour (plain JavaScript)
scripts/                 validate-catalog.mjs, make-thumbnails.mjs, generate-samples.mjs
netlify.toml             build settings, caching and security headers
```
