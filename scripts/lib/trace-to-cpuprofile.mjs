// Extract the renderer main-thread CPU profile from a Chrome trace (JSON or .gz) into .cpuprofile.
// Usage: node scripts/lib/trace-to-cpuprofile.mjs <trace.json> <out.cpuprofile>
import fs from 'fs';
import zlib from 'zlib';
const [inFile, outFile] = process.argv.slice(2);
import readline from 'readline';
// Traces are one event per line; stream and keep only CPU profile events (traces can exceed 500 MB).
const events = [];
const input = inFile.endsWith('.gz') ? fs.createReadStream(inFile).pipe(zlib.createGunzip()) : fs.createReadStream(inFile);
for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) {
  if (!line.includes('"Profile')) continue;
  const text = line.replace(/^\s*,?/, '').replace(/,\s*$/, '');
  try { const e = JSON.parse(text); if (e.name === 'Profile' || e.name === 'ProfileChunk') events.push(e); } catch { /* not an event line */ }
}
// Pick the profile id with the most samples.
const profiles = new Map();
for (const e of events) {
  if (e.name === 'Profile') profiles.set(`${e.pid}:${e.id}`, { pid: e.pid, tid: e.tid, startTime: e.args.data.startTime, nodes: new Map(), samples: [], timeDeltas: [] });
}
events.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
for (const e of events) {
  if (e.name !== 'ProfileChunk') continue;
  const p = profiles.get(`${e.pid}:${e.id}`); if (!p) continue;
  const d = e.args.data;
  for (const n of d.cpuProfile?.nodes ?? []) p.nodes.set(n.id, { ...n, children: [] });
  p.samples.push(...(d.cpuProfile?.samples ?? []));
  p.timeDeltas.push(...(d.timeDeltas ?? []));
}
let best; for (const p of profiles.values()) if (!best || p.samples.length > best.samples.length) best = p;
for (const n of best.nodes.values()) if (n.parent !== undefined) best.nodes.get(n.parent)?.children.push(n.id);
const nodes = [...best.nodes.values()].map(({ parent, ...n }) => n);
let t = best.startTime; for (const d of best.timeDeltas) t += d;
fs.writeFileSync(outFile, JSON.stringify({ nodes, startTime: best.startTime, endTime: t, samples: best.samples, timeDeltas: best.timeDeltas }));
console.log(`profiles=${profiles.size} picked pid=${best.pid} tid=${best.tid} samples=${best.samples.length} span=${((t - best.startTime) / 1000).toFixed(0)}ms`);
