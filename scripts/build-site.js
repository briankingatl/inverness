/**
 * Build the deployable static site into dist/.
 *
 * Copies everything from the repo root EXCEPT local-only files:
 *   - admin/  (local management panel — never published)
 *   - node_modules/, scripts/, package*.json (dev/build tooling)
 *   - dotfiles, .env, *.log
 *
 * Point your static host's publish directory at dist/:
 *   Netlify:        Build command `npm run build`, Publish directory `dist`
 *   Vercel:         Build command `npm run build`, Output directory `dist`
 *   Cloudflare:     Build command `npm run build`, Output directory `dist`
 *   GitHub Pages:   Actions workflow that uploads dist/ as the Pages artifact
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Top-level entries that are local-only and must never be published
const EXCLUDE = new Set([
  'admin',
  'node_modules',
  'scripts',
  'dist',
  '.git',
  '.claude',
  '.gitignore',
  '.env',
  'package.json',
  'package-lock.json'
]);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const entries = fs.readdirSync(ROOT, { withFileTypes: true });
let copied = 0;
for (const entry of entries) {
  if (EXCLUDE.has(entry.name)) continue;
  if (entry.name.endsWith('.log')) continue;
  fs.cpSync(path.join(ROOT, entry.name), path.join(DIST, entry.name), { recursive: true });
  copied++;
}

console.log(`✓ Site staged in dist/ (${copied} top-level entries, admin/ excluded)`);
