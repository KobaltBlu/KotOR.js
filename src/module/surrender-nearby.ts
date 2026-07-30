/**
 * Retail SurrenderToEnemies walks area game objects (GetCreatureByGameObjectID).
 * Party members are removed from area.creatures on join — merge them in like
 * ModuleObjectManager.GetObjectsInShape.
 *
 * @file surrender-nearby.ts
 */

export function collectSurrenderNearbyCreatures<T extends object>(
  areaCreatures: (T | null | undefined)[] | undefined | null,
  party: (T | null | undefined)[] | undefined | null,
): T[] {
  const nearby: T[] = [];
  if(areaCreatures?.length){
    for(let i = 0; i < areaCreatures.length; i++){
      const c = areaCreatures[i];
      if(c) nearby.push(c);
    }
  }
  if(party?.length){
    for(let i = 0; i < party.length; i++){
      const pm = party[i];
      if(pm && nearby.indexOf(pm) === -1){
        nearby.push(pm);
      }
    }
  }
  return nearby;
}
