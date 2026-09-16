import { OdysseyModelUtility } from "@/odyssey/OdysseyModelUtility";
import type { OdysseyFace3 } from "@/three/odyssey";
import type { SurfaceMaterial } from "@/engine/SurfaceMaterial";

/**
 * Surface-material bitmasks for collision / LOS (surfacemat.2da).
 *
 * Walk-check: `walkcheck && !walk` — Nonwalk, Lava, Pit… (static walk blockers).
 * Line-of-sight: `lineofsight` — Obscuring + most solid mats; Transparent/Door/Trigger do NOT
 * block visual LOS (visual LOS / hasVisualLos room AABB / walkmesh faces).
 *
 * @file walk-check-material-mask.ts
 */

let cachedWalkMask: number | undefined;
let cachedLosMask: number | undefined;
let cachedMatCount = -1;

function ensureCaches(): void {
  const mats = OdysseyModelUtility.SURFACEMATERIALS as SurfaceMaterial[] | undefined;
  const count = mats?.length ?? 0;
  if(cachedWalkMask != null && cachedLosMask != null && cachedMatCount === count){
    return;
  }

  let walkMask = 0;
  let losMask = 0;
  if(mats?.length){
    for(let i = 0; i < mats.length; i++){
      const m = mats[i];
      if(!m) continue;
      const bit = 1 << (i & 0x1f);
      if(m.walkCheck && !m.walk){
        walkMask |= bit;
      }
      if(m.lineOfSight){
        losMask |= bit;
      }
    }
  }else{
    // Fallback before 2DA load
    // Walk-check: 7 Nonwalk, 8 Transparent, 15 Lava, 16 Pit, 17 DeepWater, 19 NonWalkGrass
    for(const i of [7, 8, 15, 16, 17, 19]){
      walkMask |= 1 << (i & 0x1f);
    }
    // LOS: Obscuring(1) + walk solids; exclude Transparent(8), Door(18), Trigger(30)
    for(const i of [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19]){
      losMask |= 1 << (i & 0x1f);
    }
  }

  cachedWalkMask = walkMask;
  cachedLosMask = losMask;
  cachedMatCount = count;
}

/**
 * Bitmask of surface material indices that block static walk blocker corridor tests.
 * Uses low 5 bits of material index (`1 << (mat & 0x1f)`).
 */
export function getWalkCheckMaterialMask(): number {
  ensureCaches();
  return cachedWalkMask!;
}

/**
 * Bitmask of materials that block visual LOS / hasVisualLos / perception rays
 * (`surfacemat.lineofsight`).
 */
export function getLineOfSightMaterialMask(): number {
  ensureCaches();
  return cachedLosMask!;
}

/** Invalidate caches after surfacemat reload. */
export function clearWalkCheckMaterialMaskCache(): void {
  cachedWalkMask = undefined;
  cachedLosMask = undefined;
  cachedMatCount = -1;
}

/** @deprecated alias — clears both walk-check and LOS caches. */
export const clearSurfaceMaterialMaskCaches = clearWalkCheckMaterialMaskCache;

/**
 * True if face material is in the walk-check blocking mask.
 */
export function isWalkCheckBlockingFace(face: OdysseyFace3 | undefined): boolean {
  if(!face) return false;
  const mat = face.surfacemat;
  if(mat){
    return !!(mat.walkCheck && !mat.walk);
  }
  const idx = (face.materialIndex ?? face.walkIndex ?? 0) & 0x1f;
  return (getWalkCheckMaterialMask() & (1 << idx)) !== 0;
}

/**
 * True if face blocks visual / combat visual LOS / hasVisualLos.
 * Prefer `blocksLineOfSight` / surfacemat.lineOfSight over walk-check.
 */
export function isLineOfSightBlockingFace(face: OdysseyFace3 | undefined): boolean {
  if(!face) return false;
  if(face.blocksLineOfSight) return true;
  const mat = face.surfacemat;
  if(mat){
    return !!mat.lineOfSight;
  }
  const idx = (face.materialIndex ?? face.walkIndex ?? 0) & 0x1f;
  return (getLineOfSightMaterialMask() & (1 << idx)) !== 0;
}
