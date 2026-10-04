import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(p, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const replacements = [
  [/@core\/resource\/DLGObject/g, '@engine/dialog/DLGObject'],
  [/@core\/resource\/DLGNode/g, '@engine/dialog/DLGNode'],
  [/@core\/resource\/BIKObject/g, '@engine/video/BIKObject'],
  [/@engine\/render\/PixelManager/g, '@core/utility/PixelManager'],
];

let count = 0;
for (const file of [...walk('src'), ...walk('scripts')]) {
  if (file.includes('scripts/restructure')) continue;
  let s = fs.readFileSync(file, 'utf8');
  let next = s;
  for (const [re, to] of replacements) next = next.replace(re, to);
  if (next !== s) {
    fs.writeFileSync(file, next);
    count++;
    console.log(file);
  }
}
console.log('updated', count, 'files');
