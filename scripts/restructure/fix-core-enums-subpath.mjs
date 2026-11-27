/**
 * After combat/chargen/controls/gui/minigames were dropped from @core/enums barrel,
 * rewrite imports that pulled those symbols from "@core/enums" to subpath imports.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');

const domains = ['combat', 'chargen', 'controls', 'gui', 'minigames'];
const SYMBOL_PATH = {};
for (const d of domains) {
  const dir = path.join(SRC, 'core/enums', d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.ts') || f === 'index.ts') continue;
    const name = f.replace(/\.ts$/, '');
    SYMBOL_PATH[name] = `@core/enums/${d}/${name}`;
  }
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const importRe = /import\s*(type\s*)?\{([^}]+)\}\s*from\s*["']@core\/enums["'];?/g;

let fixed = 0;
for (const file of walk(SRC)) {
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;
  src = src.replace(importRe, (full, typeKw, body) => {
    const isType = !!typeKw;
    const names = body.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
      if (!m) return { raw: s, name: s.replace(/^type\s+/, '').split(/\s+/)[0] };
      return { raw: s, name: m[2] };
    });
    const keep = [];
    const moved = [];
    for (const n of names) {
      const dest = SYMBOL_PATH[n.name];
      if (dest) moved.push({ ...n, dest });
      else keep.push(n);
    }
    if (!moved.length) return full;
    changed = true;
    const lines = [];
    const typePrefix = isType ? 'type ' : '';
    if (keep.length) {
      lines.push(`import ${typePrefix}{ ${keep.map((k) => k.raw).join(', ')} } from "@core/enums";`);
    }
    const byDest = new Map();
    for (const m of moved) {
      if (!byDest.has(m.dest)) byDest.set(m.dest, []);
      byDest.get(m.dest).push(m.raw);
    }
    for (const [dest, raws] of byDest) {
      lines.push(`import ${typePrefix}{ ${raws.join(', ')} } from "${dest}";`);
    }
    return lines.join('\n');
  });
  if (changed) {
    fs.writeFileSync(file, src);
    console.log(path.relative(ROOT, file));
    fixed++;
  }
}
console.log('fixed', fixed, 'symbols', Object.keys(SYMBOL_PATH).length);
