import * as THREE from 'three';
import type { GameObject } from '@engine/module/GameObject';
import { isCreature } from '@engine/module/guards/isCreature';
import { isPlaceable } from '@engine/module/guards/isPlaceable';
import { NWScriptInstance } from '@engine/nwscript/NWScriptInstance';
import { OdysseyModel3D } from '@engine/render/three/odyssey';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class GameObjectDestructionService {
  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  updateDestroy(delta: number = 0){
    if(!this.host.willDestroy || this.host.destroyed) return;
    this.host.timeSinceDestroyStarted += delta;
    this.host.updateDestroyFade(delta);
    const fadeLength = this.host.getFadeDuration();
    const fadeEnd = this.host.noFadeOnDestroy ? 0 : this.host.delayUntilFade + fadeLength;
    if(this.host.timeSinceDestroyStarted >= Math.max(this.host.delayUntilDestroy, fadeEnd)){
      this.host.destroy();
    }
  }

  updateDestroyFade(_delta: number = 0){
    if(this.host.noFadeOnDestroy || this.host.destroyed) return;
    if(this.host.timeSinceDestroyStarted >= this.host.delayUntilFade){
      const elapsed = this.host.timeSinceDestroyStarted - this.host.delayUntilFade;
      const length = this.host.getFadeDuration();
      this.host.setOpacity(length > 0 ? Math.max(0, 1 - elapsed / length) : 0);
    }
  }

  setWillDestroy(willDestroy: boolean){
    this.host.willDestroy = willDestroy;
    this.host.timeSinceDestroyStarted = 0;
  }

  setDelayUntilDestroy(delay: number){
    this.host.delayUntilDestroy = delay;
    this.host.timeSinceDestroyStarted = 0;
  }

  setDelayUntilFade(delay: number){
    this.host.delayUntilFade = isCreature(this.host) || isPlaceable(this.host) ? delay : 0;
  }

  setFadeDuration(duration: number){
    this.host.fadeDuration = Math.max(0, duration);
  }

  getFadeDuration(defaultDuration: number): number {
    return this.host.fadeDuration > 0 ? this.host.fadeDuration : defaultDuration;
  }

  setNoFadeOnDestroy(noFade: boolean){
    this.host.noFadeOnDestroy =
      isCreature(this.host) || isPlaceable(this.host) ? noFade : false;
  }

  destroy(){
    this.host.destroyed = true;
    try{ console.log('destroy', this.host.getTag(), this.host); }catch(_error){}
    try{
      this.host.container.removeFromParent();
      this.host.removeShadowBlob();
      if(this.host.model instanceof OdysseyModel3D){
        this.host.model.removeFromParent();
        this.host.model.dispose();
        this.host.model = undefined;
      }
      if(this.host.mesh instanceof THREE.Mesh){
        this.host.mesh.removeFromParent();
        (this.host.mesh.material as THREE.Material).dispose();
        this.host.mesh.geometry.dispose();
        this.host.mesh.material = undefined;
        this.host.mesh.geometry = undefined;
        this.host.mesh = undefined;
      }
      this.host.audioEmitter?.destroy();
      this.host.audioEmitter = undefined;
      this.host.footstepEmitter?.destroy();
      this.host.footstepEmitter = undefined;
      for(let i = this.host.effects.length - 1; i >= 0; i--){
        this.host.effects[i]?.onRemove();
      }
      this.host.effects.length = 0;
      Object.keys(this.host.scripts).forEach((key) => {
        if(this.host.scripts[key] instanceof NWScriptInstance) this.host.scripts[key].dispose();
      });
      this.host.scripts = {};
      this.host.actionQueue?.clear();
      this.host.actionQueue = undefined;
      this.host.setComputedPath(undefined);
      if(this.host.perceptionList) this.host.perceptionList.length = 0;
      if(this.host.inventory){
        for(let i = this.host.inventory.length - 1; i >= 0; i--){
          this.host.inventory[i]?.destroy();
        }
        this.host.inventory.length = 0;
      }
      if(this.host.rooms) this.host.rooms.length = 0;
      if(this.host.objectsInside) this.host.objectsInside.length = 0;
      this.host.forceVector = undefined;
      this.host.box = undefined;
      this.host.sphere = undefined;
      this.host.v20 = undefined;
      this.host.v21 = undefined;
      this.host.area?.detachObject(this.host);
      this.host.area = undefined;
      this.host.room = undefined;
      this.host.lookAtObject = undefined;
      this.host.lastTriggerEntered = undefined;
      this.host.lastTriggerExited = undefined;
      this.host.lastAreaEntered = undefined;
      this.host.lastAreaExited = undefined;
      this.host.lastModuleEntered = undefined;
      this.host.lastModuleExited = undefined;
      this.host.lastDoorEntered = undefined;
      this.host.lastDoorExited = undefined;
      this.host.lastPlaceableEntered = undefined;
      this.host.lastPlaceableExited = undefined;
      this.host.lastAoeEntered = undefined;
      this.host.lastAoeExited = undefined;
      this.host.conversation = undefined;
      this.host.linkedToObject = undefined;
      this.runtime.remove(this.host);
    }catch(error){
      console.error('GameObject.destroy', error);
    }
  }
}
