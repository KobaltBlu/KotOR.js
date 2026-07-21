/**
 * Retail CSWMiniGameObjectArray @ 0066bf10 —
 * client-global 255-slot registry of live minigame objects (followers + obstacles).
 * Ctor @ 0066c540 claims findNextEmptyIndex; dtor @ 0066c610 clears the slot.
 * GetMiniGameObjectByName @ 0066bfb0 scans objects[0..0xfe] by name.
 *
 * Distinct from ModuleMiniGame.obstacleTemplates (ARE Obstacles Name→Scripts structs).
 *
 * @file MiniGameObjectArray.ts
 */

import type { ModuleObject } from '@/module/ModuleObject';

export class MiniGameObjectArray {
  /** Retail loop bound — 0xff slots (indices 0..254). */
  static readonly CAPACITY = 0xff;
  /** Retail empty / invalid mgo_index. */
  static readonly INVALID_INDEX = 0xff;

  static objects: (ModuleObject | undefined)[] = new Array(MiniGameObjectArray.CAPACITY);
  /** Retail findNextEmptyIndex cursor (wraps at 0xff). */
  static index = 0;

  static normalizeName(name: string | undefined | null): string {
    return String(name ?? '').replace(/\0[\s\S]*$/g, '').toLowerCase();
  }

  static clear(){
    for(let i = 0; i < MiniGameObjectArray.CAPACITY; i++){
      MiniGameObjectArray.objects[i] = undefined;
    }
    MiniGameObjectArray.index = 0;
  }

  /**
   * Retail findNextEmptyIndex @ 0066c060 —
   * walk from cursor to first empty slot; wrap; return 0xff if full.
   */
  static findNextEmptyIndex(): number {
    const start = MiniGameObjectArray.index;
    let curr = start;
    while(true){
      if(!MiniGameObjectArray.objects[curr]){
        MiniGameObjectArray.index = curr;
        return curr;
      }
      curr = curr + 1;
      if(curr === MiniGameObjectArray.CAPACITY){
        curr = 0;
      }
      MiniGameObjectArray.index = curr;
      if(curr === start){
        return MiniGameObjectArray.INVALID_INDEX;
      }
    }
  }

  /**
   * Retail CSWMiniGameObject ctor registration @ 0066c540.
   * Stores slot on `object.mgoIndex` and syncs `object.id` for NWScript
   * StackPushObject / StoreState (retail pushes mgo_index).
   */
  static register(object: ModuleObject | undefined): number {
    if(!object){ return MiniGameObjectArray.INVALID_INDEX; }
    const existing = object.mgoIndex;
    if(typeof existing === 'number' && existing >= 0 && existing < MiniGameObjectArray.CAPACITY){
      if(MiniGameObjectArray.objects[existing] === object){
        object.id = existing;
        return existing;
      }
    }
    const slot = MiniGameObjectArray.findNextEmptyIndex();
    if(slot === MiniGameObjectArray.INVALID_INDEX){
      console.warn('MiniGameObjectArray: registry full (255)');
      object.mgoIndex = MiniGameObjectArray.INVALID_INDEX;
      return slot;
    }
    MiniGameObjectArray.objects[slot] = object;
    object.mgoIndex = slot;
    // Retail StackPushObject(VirtualMachine, mgo_index) — NWScript object id == slot.
    object.id = slot;
    MiniGameObjectArray.index = slot + 1;
    if(MiniGameObjectArray.index === MiniGameObjectArray.CAPACITY){
      MiniGameObjectArray.index = 0;
    }
    return slot;
  }

  /** Retail ~CSWMiniGameObject @ 0066c610 — clear objects[mgo_index]. */
  static unregister(object: ModuleObject | undefined): void {
    if(!object){ return; }
    const slot = object.mgoIndex;
    if(typeof slot !== 'number' || slot < 0 || slot >= MiniGameObjectArray.CAPACITY){
      return;
    }
    if(MiniGameObjectArray.objects[slot] === object){
      MiniGameObjectArray.objects[slot] = undefined;
    }
    object.mgoIndex = MiniGameObjectArray.INVALID_INDEX;
  }

  /** Retail GetMiniGameObject @ 0066bf30 — by index. */
  static get(index: number): ModuleObject | undefined {
    if(index < 0 || index >= MiniGameObjectArray.CAPACITY){ return undefined; }
    return MiniGameObjectArray.objects[index];
  }

  /**
   * Retail GetMiniGameObjectByName @ 0066bfb0 —
   * linear scan of live slots; name compare is case-insensitive.
   */
  static getByName(name: string | undefined | null): ModuleObject | undefined {
    const n = MiniGameObjectArray.normalizeName(name);
    if(!n){ return undefined; }
    for(let i = 0; i < MiniGameObjectArray.CAPACITY; i++){
      const obj = MiniGameObjectArray.objects[i];
      if(!obj){ continue; }
      if(MiniGameObjectArray.normalizeName(obj.name) === n){
        return obj;
      }
    }
    return undefined;
  }
}
