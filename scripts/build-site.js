/**
 * Build the deployable static site into dist/.
 *
 * Produces a host-friendly deployment that only ever needs to serve
 * index.html and .png files:
 *
 *   dist/
 *   ├── index.html   Fully self-contained: <style> (css), <script> (js),
 *   │                and <script type="application/json"> blocks for the
 *   │                events/POI data are all inlined. No .js, .css, or
 *   │                .json files are emitted at all.
 *   └── images/      Every raster image re-encoded as a real PNG (the host
 *                    refuses .webp/.jpg, and renaming alone would not
 *                    render). When a base name exists in several formats,
 *                    the format the site actually references wins.
 *
 * admin/ and dev tooling are never published.
 *
 * Requires sharp: `npm install sharp` (declared in package.json).
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.error('✗ sharp is required to convert images. Run: npm install');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const IMAGES = path.join(ROOT, 'images');

const RASTER_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const toPngName = name => name.replace(/\.(webp|jpe?g)$/i, '.png');

/* Which extension(s) the site content references for each image base path
   (e.g. "images/clubhouse/clubhouse-front" -> Set { ".webp" }). */
function referencedExts() {
  const sources = [
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'data', 'events.json'),
    path.join(ROOT, 'data', 'poi.json')
  ];
  const text = sources.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const map = new Map();
  for (const m of text.matchAll(/images\/[A-Za-z0-9_./-]+\.(webp|jpe?g|png)/g)) {
    const base = m[0].replace(/\.[^.]+$/, '');
    const ext = '.' + m[0].split('.').pop().toLowerCase();
    if (!map.has(base)) map.set(base, new Set());
    map.get(base).add(ext);
  }
  return map;
}

/* Pick which source file should become <base>.png when several formats
   exist: the format the site references wins; ties keep a source .png. */
function pickVariant(files, refs) {
  if (files.length === 1) return files[0];
  const referenced = files.filter(f => refs.has(path.extname(f).toLowerCase()));
  if (referenced.length === 1) return referenced[0];
  const png = files.find(f => path.extname(f).toLowerCase() === '.png');
  if (png) return png;
  return files[0];
}

/* Re-encode any raster as a genuine .png.

   Default is a 256-color palette PNG (sharp quantizes + dithers): roughly
   3-4x smaller than lossless PNG, at the cost of slight banding on smooth
   gradients. Lossless is still a real option for full quality:

       await sharp(src).png({ compressionLevel: 9 }).toFile(dst);
*/
async function convertToPng(src, dst) {
  await sharp(src).png({ palette: true, quality: 95 }).toFile(dst);
}

async function copyImages(srcDir, dstDir, refs) {
  fs.mkdirSync(dstDir, { recursive: true });

  /* Group files by their target (base).png name so format collisions
     inside one directory can be resolved together. */
  const groups = new Map();
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    const full = path.join(srcDir, entry.name);
    const ext = path.extname(entry.name).toLowerCase();
    if (!RASTER_EXT.has(ext)) {
      fs.copyFileSync(full, path.join(dstDir, entry.name)); // non-images (.gitkeep)
      continue;
    }
    const key = toPngName(entry.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(full);
  }

  for (const [name, files] of groups) {
    /* Union of the extensions the site references for these source files. */
    const relRefs = new Set();
    for (const f of files) {
      const base = path.relative(ROOT, f).split(path.sep).join('/').replace(/\.[^.]+$/, '');
      const set = refs.get(base);
      if (set) set.forEach(e => relRefs.add(e));
    }
    const winner = pickVariant(files, relRefs);
    await convertToPng(winner, path.join(dstDir, name));
  }

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) await copyImages(path.join(srcDir, entry.name), path.join(dstDir, entry.name), refs);
  }
}

/* Inline a JSON file, escaping `<` so it is safe inside a <script> tag. */
function inlineJson(filePath) {
  const raw = JSON.stringify(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  return raw.replace(/</g, '\\u003c');
}

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. Media — every raster re-encoded as a genuine .png.
  const refs = referencedExts();
  await copyImages(IMAGES, path.join(DIST, 'images'), refs);

  // 2. Legacy extra static pages (already self-contained HTML).
  const staticDir = path.join(ROOT, 'static');
  if (fs.existsSync(staticDir)) {
    fs.cpSync(staticDir, path.join(DIST, 'static'), { recursive: true });
  }

  // 3. The one-page site: css + js + json inlined, every image ref → .png.
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');

  const inlineBlock = [
    `<script type="application/json" id="eventsData">${inlineJson(path.join(ROOT, 'data', 'events.json'))}</script>`,
    `<script type="application/json" id="poiData">${inlineJson(path.join(ROOT, 'data', 'poi.json'))}</script>`,
    `<script>\n${js}\n</script>`
  ].join('\n');

  const built = html
    .replace('<link rel="stylesheet" href="css/styles.css">', () => `<style>\n${css}\n</style>`)
    .replace('<script src="js/main.js"></script>', () => inlineBlock)
    .replace(/\.webp\b/g, '.png')
    .replace(/\.jpe?g\b/g, '.png');

  fs.writeFileSync(path.join(DIST, 'index.html'), built);

  console.log('✓ dist/ built — single-file index.html (css/js/json inlined) + images/ (real .png)');
}

main().catch(err => {
  console.error('✗ build failed:', err.message);
  process.exit(1);
});
