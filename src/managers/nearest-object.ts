import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import type * as THREE from "three";

export type NearestCandidate = { obj: ModuleObject; distSq: number };

export type FindNearestInAreaOptions = {
  area: ModuleArea;
  origin: THREE.Vector3;
  /** 0-based nth (NWScript stack uses 1-based; callers subtract 1). */
  nth: number;
  /** Source object id to skip (GetNearestObject / ByTag / Creature). */
  excludeId?: number;
  matches: (obj: ModuleObject) => boolean;
};

/**
 * Insert candidate into ascending distSq list (retail CExoArrayList Insert).
 */
export function insertByDistSq(candidates: NearestCandidate[], obj: ModuleObject, distSq: number): void {
  let i = 0;
  while(i < candidates.length && candidates[i].distSq <= distSq){
    i++;
  }
  candidates.splice(i, 0, { obj, distSq });
}

/**
 * Retail ExecuteCommandGetNearestObject spiral walk:
 * start at GetFirstObjectIndiceByX, expand +1/-1/+2/-2…, insert by distSq,
 * abort a direction when |dx|² already exceeds the current nth-furthest distSq.
 */
export function findNearestInArea(opts: FindNearestInAreaOptions): ModuleObject | undefined {
  const { area, origin, matches } = opts;
  const nth = Math.max(0, opts.nth | 0);
  const excludeId = opts.excludeId;
  if(!area || !origin){
    return undefined;
  }

  area.ensureGameObjectsSorted();
  const table = area.gameObjects;
  if(!table.length){
    return undefined;
  }

  let start = area.getFirstObjectIndexByX(origin.x);
  // Retail advances to the source object's exact slot when querying by object.
  if(excludeId !== undefined){
    let found = false;
    for(let i = start; i < table.length; i++){
      if(table[i]?.id === excludeId){
        start = i;
        found = true;
        break;
      }
    }
    if(!found){
      return undefined;
    }
  }

  const candidates: NearestCandidate[] = [];
  const seen = new Set<number>();
  let stopPos = false;
  let stopNeg = false;

  const consider = (idx: number, direction: 1 | -1) => {
    if(idx < 0){
      stopNeg = true;
      return;
    }
    if(idx >= table.length){
      stopPos = true;
      return;
    }
    const obj = table[idx];
    if(!obj) return;
    const id = obj.id | 0;
    // Retail spiral never visits the source slot; skip excludeId defensively.
    if(excludeId !== undefined && id === excludeId) return;
    if(seen.has(id)) return;
    seen.add(id);
    if(!matches(obj)) return;

    const dx = obj.position.x - origin.x;
    const dy = obj.position.y - origin.y;
    const dz = obj.position.z - origin.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dxSq = dx * dx;

    // Retail: when size >= nth (1-based) and |dx|² > candidates[nth-1].distSq, stop dir.
    if(candidates.length > nth && dxSq > candidates[nth].distSq){
      if(direction > 0) stopPos = true;
      else stopNeg = true;
      return;
    }
    insertByDistSq(candidates, obj, distSq);
  };

  // Retail step sequence from GetFirstObjectIndiceByX: +1, -1, +2, -2, … (never 0).
  for(let mag = 1; mag <= table.length; mag++){
    if(stopPos && stopNeg) break;
    if(!stopPos) consider(start + mag, 1);
    if(!stopNeg) consider(start - mag, -1);
  }

  return candidates[nth]?.obj;
}
