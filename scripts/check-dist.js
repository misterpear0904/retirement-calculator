import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('check-dist: dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');

// Collect every asset URL referenced by index.html (src= / href=).
const refs = [];
const refRegex = /(?:src|href)=["']([^"']+)["']/g;
let match;
while ((match = refRegex.exec(html)) !== null) {
  refs.push(match[1]);
}

// Index of every file actually emitted under dist/, keyed by exact case
// and by lower-case for case-insensitive comparison.
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(path.relative(distDir, full).replace(/\\/g, '/'));
  }
  return out;
}
const emitted = walk(distDir);
const emittedSet = new Set(emitted);
const emittedLower = new Map(emitted.map((f) => [f.toLowerCase(), f]));

let failed = false;
for (const ref of refs) {
  // Skip external URLs.
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) continue;

  const clean = ref.replace(/^\.\//, '').split('?')[0].split('#')[0];
  if (clean === '' || clean.endsWith('/')) continue;

  if (emittedSet.has(clean)) continue;

  const actual = emittedLower.get(clean.toLowerCase());
  if (actual) {
    console.error(
      `check-dist: CASE MISMATCH - index.html references "${ref}" but dist contains "${actual}".`,
    );
  } else {
    console.error(`check-dist: MISSING - index.html references "${ref}" which is not in dist/.`);
  }
  failed = true;
}

if (failed) {
  console.error('check-dist: build verification failed.');
  process.exit(1);
}

console.log(`check-dist: verified ${refs.length} references against ${emitted.length} dist files.`);