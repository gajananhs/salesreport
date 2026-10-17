#!/usr/bin/env node
// Production build: copies public/ to dist/, stamps a content hash into the
// service worker cache name and the app version, and verifies that the
// service-worker precache list matches the files actually shipped.
// No dependencies — plain Node 18+.
import { readFile, writeFile, rm, mkdir, cp, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'public');
const OUT = join(ROOT, 'dist');

// Files that are deployed but deliberately NOT precached.
const NOT_PRECACHED = new Set([
  'service-worker.js', '404.html', 'robots.txt', '.nojekyll',
  'assets/fonts/OFL-Fraunces.txt', 'assets/fonts/OFL-IBM-Plex.txt',
]);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const rel = (p) => relative(SRC, p).split(sep).join('/');

async function main() {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const files = (await walk(SRC)).sort();

  // 1. content hash of every source file (SW included, before stamping)
  const hash = createHash('sha256');
  for (const f of files) {
    hash.update(rel(f));
    hash.update(await readFile(f));
  }
  const buildId = `${pkg.version}-${hash.digest('hex').slice(0, 10)}`;

  // 2. verify precache list
  const sw = await readFile(join(SRC, 'service-worker.js'), 'utf8');
  const block = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
  if (!block) throw new Error('PRECACHE array not found in service-worker.js');
  const listed = new Set([...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1].replace(/^\.\//, '')).filter((p) => p !== ''));
  const shipped = new Set(files.map(rel).filter((p) => !NOT_PRECACHED.has(p)));
  const missingFromList = [...shipped].filter((p) => !listed.has(p));
  const missingOnDisk = [...listed].filter((p) => !shipped.has(p) && p !== '');
  if (missingFromList.length || missingOnDisk.length) {
    if (missingFromList.length) console.error('Not in PRECACHE (add to service-worker.js):\n  ' + missingFromList.join('\n  '));
    if (missingOnDisk.length) console.error('In PRECACHE but missing from public/:\n  ' + missingOnDisk.join('\n  '));
    process.exit(1);
  }

  // 3. manifest sanity
  const manifest = JSON.parse(await readFile(join(SRC, 'manifest.json'), 'utf8'));
  for (const icon of manifest.icons) {
    await stat(join(SRC, icon.src)).catch(() => { throw new Error(`Manifest icon missing: ${icon.src}`); });
    if (icon.src.startsWith('/')) throw new Error(`Manifest icon must be relative for GitHub Pages sub-paths: ${icon.src}`);
  }
  if (manifest.start_url.startsWith('/') || manifest.scope.startsWith('/')) throw new Error('start_url and scope must be relative (./) for GitHub Pages sub-paths');

  // 4. copy + stamp
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await cp(SRC, OUT, { recursive: true });
  await writeFile(join(OUT, 'service-worker.js'), sw.replace(/const BUILD_ID = '[^']*';/, `const BUILD_ID = '${buildId}';`));
  const pwaPath = join(OUT, 'assets/js/pwa.js');
  const pwa = await readFile(pwaPath, 'utf8');
  await writeFile(pwaPath, pwa.replace(/export const APP_VERSION = '[^']*';/, `export const APP_VERSION = '${buildId}';`));

  let bytes = 0;
  for (const f of await walk(OUT)) bytes += (await stat(f)).size;
  console.log(`Built ${files.length} files (${(bytes / 1024).toFixed(0)} KB) → dist/   build ${buildId}`);
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
