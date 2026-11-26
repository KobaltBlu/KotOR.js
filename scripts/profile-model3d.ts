/**
 * Profile OdysseyModel3D.FromMDL (MDL → THREE scene graph) against real game models.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/node-window-shim.cjs scripts/profile-model3d.ts [--k1 <path>] [--instances <n>]
 *
 * MDLLoader is redirected to chitin.key (with its normal per-resref cache), so the
 * first build of each model pays parse + supermodel parse, and later builds show the
 * steady-state per-instance cost. No WebGL: GPU upload / shader compile are not measured.
 *
 * Add `node --cpu-prof` (via NODE_OPTIONS) for function-level attribution.
 */

import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { ApplicationEnvironment } from '@core/enums/ApplicationEnvironment';
import { ApplicationProfile } from '@core/utility/ApplicationProfile';
import { KEYManager } from '@core/managers/KEYManager';
import { ResourceTypes } from '@core/resource/ResourceTypes';
import { OdysseyModel } from '@engine/odyssey/OdysseyModel';
import { MDLLoader } from '@engine/loaders/MDLLoader';
import '@engine/managers/ShaderManager';
import { OdysseyModel3D } from '@engine/render/three/odyssey/OdysseyModel3D';

const DEFAULT_K1_PATHS = [
  process.env.KOTOR_PATH,
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\swkotor',
  'C:\\Games\\swkotor-steam',
].filter(Boolean) as string[];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const parseCache = new Map<string, OdysseyModel>();
let parseMs = 0;

async function loadFromKey(resref: string): Promise<OdysseyModel | undefined> {
  resref = (resref || '').toLowerCase();
  if (!resref) return undefined;
  const hit = parseCache.get(resref);
  if (hit) return hit;
  const mdlKey = KEYManager.Key.getFileKey(resref, ResourceTypes.mdl);
  if (!mdlKey) return undefined;
  const mdl = await KEYManager.Key.getFileBuffer(mdlKey);
  const mdxKey = KEYManager.Key.getFileKey(resref, ResourceTypes.mdx);
  const mdx = (mdxKey && (await KEYManager.Key.getFileBuffer(mdxKey))) || new Uint8Array(0);
  const t0 = performance.now();
  const model = OdysseyModel.FromBuffers(mdl, mdx);
  parseMs += performance.now() - t0;
  parseCache.set(resref, model);
  return model;
}

type Case = { label: string; resref: string; options: any; instances: number };

async function timeCase(c: Case): Promise<void> {
  const mdl = await loadFromKey(c.resref);
  if (!mdl) {
    console.log(`${c.label.padEnd(28)} missing ${c.resref}`);
    return;
  }
  const times: number[] = [];
  const parseBefore = parseMs;
  let last: OdysseyModel3D | undefined;
  for (let i = 0; i < c.instances; i++) {
    const t0 = performance.now();
    last = await OdysseyModel3D.FromMDL(mdl, { ...c.options });
    times.push(performance.now() - t0);
  }
  let meshes = 0;
  let objects = 0;
  last?.traverse((o: any) => { objects++; if (o.isMesh) meshes++; });
  const first = times[0];
  const rest = times.slice(1);
  const steady = rest.length ? rest.reduce((a, b) => a + b, 0) / rest.length : NaN;
  console.log(
    c.label.padEnd(28),
    c.resref.padEnd(14),
    `first ${first.toFixed(1).padStart(7)} ms`,
    `steady ${steady.toFixed(1).padStart(7)} ms`,
    `(supermodel parse in first: ${(parseMs - parseBefore).toFixed(1)} ms)`,
    `anims ${String(last?.odysseyAnimations.length ?? 0).padStart(4)}`,
    `objs ${String(objects).padStart(5)} meshes ${String(meshes).padStart(4)}`,
  );
}

async function main(): Promise<void> {
  const gameDir = arg('--k1') ?? DEFAULT_K1_PATHS.find((p) => fs.existsSync(`${p}\\chitin.key`));
  if (!gameDir) throw new Error('KotOR I install not found; pass --k1 <path>');
  const n = Number(arg('--instances') ?? 10);
  const only = arg('--only');

  ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
  ApplicationProfile.directory = gameDir;
  await KEYManager.Load('chitin.key');

  (MDLLoader.loader as any).load = loadFromKey;

  const roomOpts = { castShadow: false, receiveShadow: true, mergeStatic: true };
  const creatureOpts = { castShadow: true, receiveShadow: false, shadowsEnabled: true, textureVar: '****' };
  const plcOpts = { castShadow: true, receiveShadow: true, static: true };

  const cases: Case[] = [
    { label: 'room (big)', resref: 'm31ab_00a', options: roomOpts, instances: 3 },
    { label: 'room (typical)', resref: 'm02ae_07a', options: roomOpts, instances: 3 },
    { label: 'room (lightmapped)', resref: 'm15aa_01a', options: roomOpts, instances: 3 },
    { label: 'creature body (PC)', resref: 'p_bastilabb', options: creatureOpts, instances: n },
    { label: 'creature body (male PC)', resref: 'p_carthbb', options: creatureOpts, instances: n },
    { label: 'creature head', resref: 'p_bastilah', options: creatureOpts, instances: n },
    { label: 'creature (monster)', resref: 'c_rakghoul', options: creatureOpts, instances: n },
    { label: 'creature (droid)', resref: 'p_hk47', options: creatureOpts, instances: n },
    { label: 'malak', resref: 'n_darthmalak', options: creatureOpts, instances: n },
    { label: 'placeable', resref: 'plc_footlker', options: plcOpts, instances: n },
    { label: 'door', resref: 'dor_ukn02', options: plcOpts, instances: n },
  ].filter((c) => !only || new RegExp(only).test(c.label));

  for (const c of cases) {
    try {
      await timeCase(c);
    } catch (e) {
      console.log(`${c.label} failed:`, e);
    }
  }
  console.log(`\nTotal MDL parse time across all loads: ${parseMs.toFixed(1)} ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
