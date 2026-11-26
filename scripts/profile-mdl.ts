/**
 * Profile OdysseyModel binary ingest against real game models.
 *
 * Usage:
 *   npx tsx scripts/profile-mdl.ts [--k1 <path>] [--filter <regex>] [--iters <n>] [--top <n>]
 *
 * Phase 1 reads every MDL/MDX pair from chitin.key into memory (timed as I/O).
 * Phase 2 parses each pair `iters` times with OdysseyModel.FromBuffers and
 * reports totals, the slowest models, and node/animation/keyframe counts.
 *
 * Run with `node --cpu-prof --import tsx scripts/profile-mdl.ts` to capture a
 * .cpuprofile for function-level attribution (see scripts/summarize-cpuprofile.mjs).
 */

import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { ApplicationEnvironment } from '@core/enums/ApplicationEnvironment';
import { ApplicationProfile } from '@core/utility/ApplicationProfile';
import { KEYManager } from '@core/managers/KEYManager';
import { ResourceTypes } from '@core/resource/ResourceTypes';
import { OdysseyModel } from '@engine/odyssey/OdysseyModel';
import type { OdysseyModelNode } from '@engine/odyssey/OdysseyModelNode';

const DEFAULT_K1_PATHS = [
  process.env.KOTOR_PATH,
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\swkotor',
  'C:\\Games\\swkotor-steam',
  'C:\\GOG Games\\Star Wars - Knights of the Old Republic',
].filter(Boolean) as string[];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type Pair = { resref: string; mdl: Uint8Array; mdx: Uint8Array };

function countKeys(nodes: OdysseyModelNode[]): { controllers: number; frames: number } {
  let controllers = 0;
  let frames = 0;
  for (const n of nodes) {
    n.controllers.forEach((c: any) => {
      controllers++;
      frames += c?.data?.length ?? 0;
    });
  }
  return { controllers, frames };
}

function collectGeometryNodes(root: OdysseyModelNode, out: OdysseyModelNode[] = []): OdysseyModelNode[] {
  if (!root) return out;
  out.push(root);
  for (const c of root.children) collectGeometryNodes(c, out);
  return out;
}

async function main(): Promise<void> {
  const gameDir = arg('--k1') ?? DEFAULT_K1_PATHS.find((p) => fs.existsSync(`${p}\\chitin.key`));
  if (!gameDir) throw new Error('KotOR I install not found; pass --k1 <path>');
  const filter = arg('--filter') ? new RegExp(arg('--filter')!, 'i') : undefined;
  const iters = Number(arg('--iters') ?? 3);
  const top = Number(arg('--top') ?? 25);
  const preserve = process.argv.includes('--preserve');

  ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
  ApplicationProfile.directory = gameDir;
  await KEYManager.Load('chitin.key');

  const keys = KEYManager.Key.keys.filter(
    (k) => k.resType === ResourceTypes.mdl && (!filter || filter.test(k.resRef)),
  );

  // Phase 1: I/O
  const ioStart = performance.now();
  const pairs: Pair[] = [];
  for (const key of keys) {
    const mdl = await KEYManager.Key.getFileBuffer(key);
    if (!mdl?.length) continue;
    const mdxKey = KEYManager.Key.getFileKey(key.resRef, ResourceTypes.mdx);
    const mdx = (mdxKey && (await KEYManager.Key.getFileBuffer(mdxKey))) || new Uint8Array(0);
    pairs.push({ resref: key.resRef.toLowerCase(), mdl, mdx });
  }
  const ioMs = performance.now() - ioStart;
  const totalBytes = pairs.reduce((s, p) => s + p.mdl.length + p.mdx.length, 0);
  console.log(`I/O: ${pairs.length} models, ${(totalBytes / 1048576).toFixed(1)} MB in ${ioMs.toFixed(0)} ms (serial awaits)`);

  // Phase 2: parse
  const results: Array<{
    resref: string; ms: number; kb: number; nodes: number; anims: number; animNodes: number; frames: number;
  }> = [];
  let failed = 0;
  // Warmup so JIT is hot for the measured runs.
  for (const p of pairs.slice(0, Math.min(50, pairs.length))) {
    try { OdysseyModel.FromBuffers(p.mdl, p.mdx, { preserveSourceBinary: preserve }); } catch { /* ignore */ }
  }

  const parseStart = performance.now();
  for (const p of pairs) {
    let best = Infinity;
    let model: OdysseyModel | undefined;
    try {
      for (let i = 0; i < iters; i++) {
        const t0 = performance.now();
        model = OdysseyModel.FromBuffers(p.mdl, p.mdx, { preserveSourceBinary: preserve });
        const dt = performance.now() - t0;
        if (dt < best) best = dt;
      }
    } catch {
      failed++;
      continue;
    }
    const geo = collectGeometryNodes(model!.rootNode);
    let animNodes = 0;
    let frames = countKeys(geo).frames;
    for (const a of model!.animations) {
      animNodes += a.nodes.length;
      frames += countKeys(a.nodes).frames;
    }
    results.push({
      resref: p.resref,
      ms: best,
      kb: (p.mdl.length + p.mdx.length) / 1024,
      nodes: geo.length,
      anims: model!.animations.length,
      animNodes,
      frames,
    });
  }
  const parseWall = performance.now() - parseStart;
  const sumBest = results.reduce((s, r) => s + r.ms, 0);
  const sumKb = results.reduce((s, r) => s + r.kb, 0);
  console.log(`Parse: ${results.length} ok, ${failed} failed; sum(best of ${iters}) = ${sumBest.toFixed(0)} ms, wall ${parseWall.toFixed(0)} ms`);
  console.log(`Throughput: ${(sumKb / 1024 / (sumBest / 1000)).toFixed(1)} MB/s (preserveSourceBinary=${preserve})`);

  results.sort((a, b) => b.ms - a.ms);
  console.log(`\nTop ${top} slowest:`);
  console.log('resref'.padEnd(18), 'ms'.padStart(8), 'KB'.padStart(8), 'nodes'.padStart(6), 'anims'.padStart(6), 'animNodes'.padStart(10), 'keyframes'.padStart(10));
  for (const r of results.slice(0, top)) {
    console.log(
      r.resref.padEnd(18), r.ms.toFixed(2).padStart(8), r.kb.toFixed(0).padStart(8), String(r.nodes).padStart(6),
      String(r.anims).padStart(6), String(r.animNodes).padStart(10), String(r.frames).padStart(10),
    );
  }

  // Correlation hints: time share for models with animations vs without.
  const withAnim = results.filter((r) => r.anims > 0);
  const noAnim = results.filter((r) => r.anims === 0);
  const sum = (xs: typeof results, f: (r: typeof results[0]) => number) => xs.reduce((s, r) => s + f(r), 0);
  console.log(`\nModels with animations: ${withAnim.length}, ${sum(withAnim, (r) => r.ms).toFixed(0)} ms, ${(sum(withAnim, (r) => r.kb) / 1024).toFixed(1)} MB, ${sum(withAnim, (r) => r.frames)} keyframes`);
  console.log(`Models without:         ${noAnim.length}, ${sum(noAnim, (r) => r.ms).toFixed(0)} ms, ${(sum(noAnim, (r) => r.kb) / 1024).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
