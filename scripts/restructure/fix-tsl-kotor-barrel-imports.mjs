/**
 * Rewrite TSL menu imports from @engine/games/kotor/KOTOR barrel
 * to concrete kotor/menu (or kotor/gui) modules.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TSL_MENU = path.join(ROOT, 'src/engine/games/tsl/menu');
const KOTOR_MENU = path.join(ROOT, 'src/engine/games/kotor/menu');
const KOTOR_GUI = path.join(ROOT, 'src/engine/games/kotor/gui');

/** @type {Map<string, string>} symbol -> @engine/... path */
const symbolPath = new Map();

function indexDir(dir, aliasPrefix) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.ts') || f.endsWith('.d.ts')) continue;
    const base = f.replace(/\.ts$/, '');
    const filePath = path.join(dir, f);
    const src = fs.readFileSync(filePath, 'utf8');
    const re = /export\s+(?:class|enum|const|type|interface|function)\s+(\w+)/g;
    let m;
    while ((m = re.exec(src))) {
      symbolPath.set(m[1], `${aliasPrefix}/${base}`);
    }
    // Also map filename as default class name if exported
    if (src.includes(`export class ${base}`)) {
      symbolPath.set(base, `${aliasPrefix}/${base}`);
    }
  }
}

indexDir(KOTOR_MENU, '@engine/games/kotor/menu');
indexDir(KOTOR_GUI, '@engine/games/kotor/gui');

const importRe =
  /import\s*\{([^}]+)\}\s*from\s*["']@engine\/games\/kotor\/KOTOR["'];?/g;

let fixed = 0;
for (const f of fs.readdirSync(TSL_MENU)) {
  if (!f.endsWith('.ts')) continue;
  const filePath = path.join(TSL_MENU, f);
  let src = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  src = src.replace(importRe, (full, body) => {
    const parts = body.split(',').map((s) => s.trim()).filter(Boolean);
    /** @type {Map<string, string[]>} */
    const byDest = new Map();
    const unresolved = [];

    for (const part of parts) {
      const m = part.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
      if (!m) {
        unresolved.push(part);
        continue;
      }
      const name = m[1];
      const dest = symbolPath.get(name);
      if (!dest) {
        unresolved.push(part);
        continue;
      }
      if (!byDest.has(dest)) byDest.set(dest, []);
      byDest.get(dest).push(part);
    }

    if (unresolved.length && byDest.size === 0) {
      return full;
    }

    changed = true;
    const lines = [];
    for (const [dest, raws] of byDest) {
      lines.push(`import { ${raws.join(', ')} } from "${dest}";`);
    }
    if (unresolved.length) {
      console.warn(`${f}: unresolved from KOTOR barrel: ${unresolved.join(', ')}`);
      lines.push(`import { ${unresolved.join(', ')} } from "@engine/games/kotor/KOTOR";`);
    }
    return lines.join('\n');
  });

  if (changed) {
    fs.writeFileSync(filePath, src);
    console.log(f);
    fixed++;
  }
}

console.log('fixed', fixed, 'symbols indexed', symbolPath.size);
