import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pageDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(pageDir, 'src');
const outFile = join(pageDir, 'index.html');

const template = readFileSync(join(srcDir, 'template.html'), 'utf8');
const style = readFileSync(join(srcDir, 'style.css'), 'utf8').trim();
const jsDir = join(srcDir, 'js');
const scriptFiles = [
  'imports.js',
  'indexeddb.js',
  'image-utils.js',
  'layout.js',
  'store.js',
  'components.js',
  'canvas.js',
  'boot.js',
];
const app = scriptFiles.map(file => readFileSync(join(jsDir, file), 'utf8').trim()).join('\n\n');

let html = template
  .replace('{{APP_STYLE}}', style)
  .replace('{{APP_SCRIPT}}', app);

writeFileSync(outFile, html, 'utf8');
console.log(`built ${outFile}`);
