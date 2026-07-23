const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const MAX_DIM = 1800;
const QUALITY = 82;

async function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await processDir(full);
      continue;
    }
    if (!/\.(jpe?g|png)$/i.test(entry.name)) continue;
    const outPath = full.replace(/\.(jpe?g|png)$/i, '.webp');
    if (fs.existsSync(outPath)) continue;
    const before = fs.statSync(full).size;
    await sharp(full)
      .rotate()
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toFile(outPath);
    const after = fs.statSync(outPath).size;
    console.log(`${path.relative(IMAGES_DIR, full)} -> ${path.relative(IMAGES_DIR, outPath)}  ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB`);
  }
}

processDir(IMAGES_DIR).then(() => console.log('done')).catch(e => { console.error(e); process.exit(1); });
