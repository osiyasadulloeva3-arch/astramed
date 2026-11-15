// node tools/gen-sw.mjs — rewrites the precache list and version in sw.js from the files on disk.
// Run it after adding, removing or changing any file the app loads.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) => readdirSync(join(root, dir)).flatMap((n) => {
  const p = `${dir}/${n}`;
  if (n.startsWith('.')) return [];
  return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
});
const files = ['index.html', 'guide.html', 'manifest.json',...['css', 'js', 'data', 'assets', 'vendor'].flatMap(walk)].sort();
const hash = createHash('sha1');
files.forEach((f) => { hash.update(f); hash.update(readFileSync(join(root, f))); });
const version = hash.digest('hex').slice(0, 10);
const sw = readFileSync(join(root, 'sw.js'), 'utf8')
  .replace(/const VERSION = '[^']*';/, `const VERSION = 'lyra-${version}';`)
  .replace(/const FILES = \[[\s\S]*?\];/, `const FILES = [\n${files.map((f) => `  './${f}',`).join('\n')}\n];`);
writeFileSync(join(root, 'sw.js'), sw);
console.log(`sw.js: ${files.length} files, version lyra-${version}`);
