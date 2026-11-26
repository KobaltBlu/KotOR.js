// Summarize a V8 .cpuprofile: top functions by self time and by inclusive (total) time.
// Usage: node scripts/lib/summarize-cpuprofile.mjs <file.cpuprofile> [top=30] [filterRegex]
import fs from 'fs';
const [file, topArg, filterArg] = process.argv.slice(2);
const top = Number(topArg ?? 30);
const filt = filterArg ? new RegExp(filterArg) : null;
const prof = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(prof.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of prof.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const dt = new Map();
for (let i = 0; i < prof.samples.length; i++) {
  const id = prof.samples[i];
  dt.set(id, (dt.get(id) ?? 0) + (prof.timeDeltas[i] ?? 0));
}
const key = (n) => {
  const cf = n.callFrame;
  const url = (cf.url || '').replace(/^.*KotOR\.js[\/]/, '').replace(/^file:\/\/\//, '');
  return `${cf.functionName || '(anon)'} ${url}:${cf.lineNumber + 1}`;
};
const self = new Map();
const total = new Map();
let all = 0;
for (const [id, us] of dt) {
  all += us;
  const n = byId.get(id);
  self.set(key(n), (self.get(key(n)) ?? 0) + us);
  // inclusive: count each distinct function once per sample stack
  const seen = new Set();
  let cur = id;
  while (cur !== undefined) {
    const k = key(byId.get(cur));
    if (!seen.has(k)) { seen.add(k); total.set(k, (total.get(k) ?? 0) + us); }
    cur = parent.get(cur);
  }
}
const fmt = (m) => [...m].filter(([k]) => !filt || filt.test(k)).sort((a, b) => b[1] - a[1]).slice(0, top)
  .map(([k, us]) => `${(us / 1000).toFixed(1).padStart(9)} ms ${((us / all) * 100).toFixed(1).padStart(5)}%  ${k}`).join('\n');
console.log(`Total sampled: ${(all / 1000).toFixed(0)} ms\n\n== SELF ==\n${fmt(self)}\n\n== TOTAL (inclusive) ==\n${fmt(total)}`);
