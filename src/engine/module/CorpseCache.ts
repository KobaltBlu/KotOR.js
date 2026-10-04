import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { ModulePlaceable } from "@engine/module/ModulePlaceable";

import { isPlaceable } from "@engine/module/guards/isPlaceable";

/**
 * corpse ring — effective capacity 3 retained KeepCorpse shells.
 * Overflow reveals the oldest linked body bag and fades out the oldest shell.
 */
export class CorpseCache {
  /** ring holds 4 slots with one empty sentinel → 3 live corpses. */
  static readonly CAPACITY = 3;

  /** SetDesiredFadeState eviction fade length (seconds). */
  static readonly EVICT_FADE_SEC = 1.0;

  private shells: ModuleCreature[] = [];

  get size(): number {
    return this.shells.length;
  }

  /** Live KeepCorpse shells for selection / raycast (not saved). */
  get retainedShells(): readonly ModuleCreature[] {
    return this.shells;
  }

  has(creature: ModuleCreature): boolean {
    return this.shells.indexOf(creature) >= 0;
  }

  /** Whether any retained shell still claims this source creature id. */
  hasSourceCreatureId(sourceId: number): boolean {
    if(!sourceId) return false;
    for(let i = 0; i < this.shells.length; i++){
      if(this.shells[i]?.id === sourceId) return true;
    }
    return false;
  }

  add(creature: ModuleCreature){
    if(!creature || this.has(creature)) return;
    while(this.shells.length >= CorpseCache.CAPACITY){
      const oldest = this.shells.shift();
      if(oldest) this.evict(oldest);
    }
    this.shells.push(creature);
  }

  remove(creature: ModuleCreature){
    const idx = this.shells.indexOf(creature);
    if(idx >= 0) this.shells.splice(idx, 1);
  }

  /** Reveal linked bag and fade/delete the retained shell (cache overflow). */
  evict(creature: ModuleCreature){
    this.remove(creature);
    const bag = creature.getBodyBagPlaceable?.();
    if(
      bag &&
      isPlaceable(bag)
    ){
      (bag as ModulePlaceable).setBodyBagVisible(true);
    }
    creature.beginRetainedCorpseFadeOut?.(CorpseCache.EVICT_FADE_SEC);
  }

  update(delta: number = 0){
    for(let i = this.shells.length - 1; i >= 0; i--){
      const shell = this.shells[i];
      if(!shell || shell.destroyed){
        this.shells.splice(i, 1);
        continue;
      }
      shell.updateRetainedCorpse?.(delta);
    }
  }

  /** Area unload / dispose — drop all shells without revealing bags. */
  clear(){
    while(this.shells.length){
      const shell = this.shells.pop();
      if(shell && !shell.destroyed){
        shell.disposeRetainedCorpse?.(false);
      }
    }
  }
}
