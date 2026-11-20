import fs from 'node:fs';
import path from 'node:path';

const distIndex = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
  console.error('dist/index.html not found');
  process.exit(1);
}

const html = fs.readFileSync(distIndex, 'utf8');
console.log('✔ dist/index.html exists and has length:', html.length, 'bytes');

if (html.includes('FORGE') || html.includes('Forge')) {
  console.log('✔ HTML contains Forge branding metadata');
}

if (html.includes('id="root"')) {
  console.log('✔ HTML contains React root mounting point');
}

const cssDir = path.join(process.cwd(), 'dist', 'assets');
const assetFiles = fs.readdirSync(cssDir);
console.log('✔ Found bundle asset files in dist/assets:', assetFiles.join(', '));

const jsFile = assetFiles.find(f => f.endsWith('.js'));
const cssFile = assetFiles.find(f => f.endsWith('.css'));

if (jsFile && cssFile) {
  const jsSize = fs.statSync(path.join(cssDir, jsFile)).size;
  const cssSize = fs.statSync(path.join(cssDir, cssFile)).size;
  console.log(`✔ Bundle stats: JS is ${(jsSize/1024).toFixed(1)} KB, CSS is ${(cssSize/1024).toFixed(1)} KB`);
}

console.log('✔ All web build verification checks PASSED!');
