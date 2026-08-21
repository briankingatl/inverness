const fs = require('fs');
const path = require('path');
const html = fs.readFileSync('dist/index.html', 'utf8');

function extract(id) {
  const re = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`);
  const m = html.match(re);
  if (!m) return null;
  return JSON.parse(m[1]);
}

const events = extract('eventsData');
const poi = extract('poiData');
console.log('eventsData OK —', events ? `${events.scrapbook.length} scrapbook, ${events.seasonal.length} seasonal, ${events.roswell.length} roswell` : 'FAILED');
console.log('poiData OK —', poi ? `${poi.length} poi entries` : 'FAILED');

// every image reference in the built HTML + inlined data must exist in dist/
const refs = new Set();
for (const m of html.matchAll(/(?:src|href|imagesrcset|content)="([^"]*\.png[^"]*)"/g)) {
  for (const part of m[1].split(/[\s,]/)) {
    if (part.endsWith('.png')) refs.add(part);
  }
}
const dataRefs = JSON.stringify([events, poi]).match(/images\/[A-Za-z0-9_./-]+\.png/g) || [];
dataRefs.forEach(r => refs.add(r));

let missing = 0;
for (const r of refs) {
  if (r.startsWith('images/') && !fs.existsSync(path.join('dist', r))) { console.log('MISSING:', r); missing++; }
}
console.log(`${refs.size} unique image refs checked, ${missing} missing`);

// the JSON payloads must not contain a raw "</script" (would close the tag early)
let unsafe = 0;
for (const id of ['eventsData', 'poiData']) {
  const re = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`);
  const m = html.match(re);
  if (m && /<\/script/i.test(m[1])) { console.log('UNSAFE </script inside', id); unsafe++; }
}
console.log(`${unsafe} json blocks with unsafe content`);

// the inlined main script must be syntactically valid (catches the
// String.replace "$$ / $& / $'" mangling of the inlined code)
const jsMatch = html.match(/<script>\r?\n([\s\S]*?)\r?\n<\/script>/);
if (jsMatch) {
  const inlineJs = jsMatch[1];
  try {
    new (require('vm').Script)(inlineJs);
    console.log('inline JS parses OK (' + inlineJs.length + ' chars)');
  } catch (e) {
    console.log('JS SYNTAX ERROR:', e.message);
    process.exitCode = 1;
  }
  const decls = inlineJs.match(/^const \$\s*=/gm) || [];
  if (decls.length !== 1) {
    console.log('BAD: expected exactly 1 `const $ =` declaration, found ' + decls.length);
    process.exitCode = 1;
  }
}
