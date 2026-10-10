import * as THREE from 'three';
import { AutoPauseState } from '@engine/enums/engine/AutoPauseState';
import { GameObjectType } from '@core/enums/module/GameObjectType';
import { ModuleCreatureAnimState } from '@core/enums/module/ModuleCreatureAnimState';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import { ScriptHook } from '@core/enums/module/ScriptHook';
import { SSFType } from '@core/enums/resource/SSFType';
import { BitWise } from '@core/utility/BitWise';
import { SWBodyBag } from '@engine/rules/SWBodyBag';
import { Placeable } from '@engine/module/Placeable';
import type { Encounter } from '@engine/module/Encounter';
import { OdysseyModel3D } from '@engine/render/three/odyssey';
import { GameState } from '@engine/runtime/GameState';
import type { Creature } from '@engine/module/Creature';
import { GameObject } from '@engine/module/GameObject';
import { isEncounter } from '@engine/module/guards/isEncounter';
import { isPlaceable } from '@engine/module/guards/isPlaceable';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class CreatureDeathCorpseService {
  constructor(
    private readonly host: Creature,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  /**
   * Per-frame death / get-up transition for living recovery and freshly-dead creatures.
   * Ordered before dialog animation in Creature.update.
   */
  updateDeathTransition(){
    // Scripted defeat (e.g. k_ptar_dueler_ud ActionPlayAnimation(DEAD, …, 360))
    // must hold the corpse pose on living Min1HP/plot NPCs. Only auto get-up
    // when recovering from a real death (deathAnimationPlayed from DIE→DEAD).
    if(
      !this.host.isDead() &&
      this.host.deathAnimationPlayed &&
      (
        this.host.animationState.index == ModuleCreatureAnimState.DEAD ||
        this.host.animationState.index == ModuleCreatureAnimState.DEAD1
      )
    ){
      this.host.deathAnimationPlayed = false;
      this.host.setAnimationState(ModuleCreatureAnimState.GET_UP_DEAD);
    }

    if(!this.host.isDead()){
      return;
    }

    this.host.getUpAnimationPlayed = false;
    if(
      this.host.deathStarted &&
      this.host.animationState.index != ModuleCreatureAnimState.DEAD &&
      this.host.animationState.index != ModuleCreatureAnimState.DIE
    ){
      this.host.setAnimationState(ModuleCreatureAnimState.DEAD);
      this.host.deathAnimationPlayed = true;
    }
    if(!this.host.deathStarted){
      this.host.deathAnimationPlayed = false;
      this.host.deathStarted = true;
      this.host.clearAllActions();
      this.host.onDeath();
      this.host.playAppearanceDeathVFX();
      this.host.playSoundSet(SSFType.DEAD);
      this.host.resetOverlayAnimationState();
      this.host.setAnimationState(ModuleCreatureAnimState.DIE);
    }
  }

  onDeath(){
    this.host.weaponPowered(false);
    const nwscript = this.host.scripts[ScriptHook.CreatureOnDeath];
    if(nwscript){
      nwscript.run(this.host);
    }

    // effect apply → RemoveFromActiveCreatureCount(..., 0)
    this.host.unlinkFromEncounter(false);

    // effect apply strips combat/buff VFX before corpse schedule (else willDestroy
    // / KeepCorpse skips effect updates and leaves frozen emitters in the world).
    this.host.clearEffectsOnDeath();

    // SetAutoPaused Party Killed when a party member dies (not full wipe)
    if((this.runtime.getParty?.() ?? []).indexOf(this.host) >= 0){
      GameState.GameOverManager?.NotifyPartyMemberDeath?.(this.host);
      // Pass AL — Mod_OnPlrDeath / GetLastPlayerDied
      GameState.module?.notifyPlayerDied?.(this.host);
      const anyAlive = (this.runtime.getParty?.() ?? []).some((pm) => pm && pm !== this.host && !pm.isDead());
      if(anyAlive){
        GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.PartyMemberKilled);
      }
    }

    // effect apply: GetDeadTemp (party + HP≤0) skips DestroyObjectDelay / KeepCorpse.
    // Dead PMs stay until TempDeath resurrection or party wipe — do not bag them.
    this.host.scheduleDestroyAsCorpse();
    return true;
  }

  getDeadTemp(): boolean {
    if(!this.host.isPartyMember()) return false;
    return this.host.getHP() < 1;
  }

  scheduleDestroyAsCorpse(){
    if(!this.host.isDestroyable) return;
    if(this.host.destroyed || this.host.serverDestroyed || this.host.isRetainedCorpse) return;
    // GetDeadTemp branch — no event 0xb / KeepCorpse for live party members
    if(this.host.isPartyMember()) return;
    // Re-apply after OnDeath DestroyObject(OBJECT_SELF) defaults so bare willDestroy
    // with delay 0 does not skip DestroyObjectDelay / FadeDelayOnDeath.
    if(this.host.corpseDestroyScheduled) return;

    const destroyDelayRaw = this.host.creatureAppearance?.destroyobjectdelay;
    const destroyDelay = (typeof destroyDelayRaw === 'number' && destroyDelayRaw >= 0)
      ? destroyDelayRaw
      : 3.0;

    // FadeDelayOnDeath INT ms when present; missing → KeepCorpse (client shell).
    const fadeDelayOnDeath = this.host.creatureAppearance?.fadedelayondeath;
    const hasFadeDelayOnDeath = typeof fadeDelayOnDeath === 'number' && fadeDelayOnDeath >= 0;
    this.host.keepCorpseOnDestroy = !hasFadeDelayOnDeath;
    const fadeDurationSec = hasFadeDelayOnDeath ? fadeDelayOnDeath / 1000 : 0;

    this.host.corpseDestroyScheduled = true;
    this.host.setWillDestroy(true);
    if(this.host.keepCorpseOnDestroy){
      // Wait DestroyObjectDelay, then enter retained shell (no opacity fade)
      this.host.setNoFadeOnDestroy(true);
      this.host.setFadeDuration(0);
      this.host.setDelayUntilFade(destroyDelay);
      this.host.setDelayUntilDestroy(destroyDelay);
    }else{
      this.host.setNoFadeOnDestroy(fadeDurationSec <= 0);
      this.host.setFadeDuration(fadeDurationSec);
      this.host.setDelayUntilFade(destroyDelay);
      this.host.setDelayUntilDestroy(destroyDelay + Math.max(fadeDurationSec, 0));
    }
  }

  updateCorpsePendingDestroy(delta: number = 0){
    if(this.host.audioEmitter){
      this.host.audioEmitter.setPosition(this.host.position.x, this.host.position.y, this.host.position.z + 1.0);
      this.host.footstepEmitter?.setPosition(this.host.position.x, this.host.position.y, this.host.position.z);
    }

    if(this.host.isDead()){
      this.host.damageList = [];
      this.host.getUpAnimationPlayed = false;
      if(
        this.host.deathStarted &&
        this.host.animationState.index != ModuleCreatureAnimState.DEAD &&
        this.host.animationState.index != ModuleCreatureAnimState.DIE
      ){
        this.host.setAnimationState(ModuleCreatureAnimState.DEAD);
        this.host.deathAnimationPlayed = true;
      }
    }

    this.host.updateAnimationState();
    this.host.updateItems(delta);

    if(this.host.model instanceof OdysseyModel3D && this.host.model.bonesInitialized){
      this.host.model.animateFrame = true;
      this.host.model.update(delta);
      this.host.updateWeaponModels(delta);
    }
  }

  getBodyBagRowId(): number {
    if(this.host.bodyBag > 0) return this.host.bodyBag;
    const fromAppearance = this.host.creatureAppearance?.body_bag;
    if(typeof fromAppearance === 'number' && fromAppearance > 0) return fromAppearance;
    return 0;
  }

  getBodyBagRule(): SWBodyBag | undefined {
    const rowId = this.host.getBodyBagRowId();
    return this.runtime.getSWRuleSet?.()?.bodyBags?.[rowId];
  }

  getBodyBagAppearance(): number {
    const bags = this.runtime.getSWRuleSet?.()?.bodyBags;
    const readAppearance = (rowId: number): number | undefined => {
      const row = bags?.[rowId];
      if(!row) return undefined;
      return row.appearance > 0 ? row.appearance : undefined;
    };

    const primary = readAppearance(this.host.getBodyBagRowId());
    if(primary != null) return primary;

    const altRow = this.host.creatureAppearance?.body_bag;
    if(typeof altRow === 'number' && altRow >= 0){
      const secondary = readAppearance(altRow);
      if(secondary != null) return secondary;
    }
    return 3;
  }

  getBodyBagPlaceable(): Placeable | undefined {
    if(!this.host.bodyBagObjectId) return undefined;
    const bag = this.runtime.getById(this.host.bodyBagObjectId) as unknown as Placeable;
    if(isPlaceable(bag)){
      return bag as Placeable;
    }
    return undefined;
  }

  getLootUseTarget(): Placeable | Creature {
    const bag = this.host.getBodyBagPlaceable();
    if(bag && !bag.destroyed){
      return bag;
    }
    return this.host;
  }

  hasLootableContents(): boolean {
    if(this.host.gold > 0) return true;
    for(let i = 0; i < this.host.inventory.length; i++){
      if(this.host.inventory[i]?.isDropable?.()) return true;
    }
    const slots = Object.keys(this.host.equipment) as (keyof typeof this.host.equipment)[];
    for(let i = 0; i < slots.length; i++){
      if(this.host.equipment[slots[i]]?.isDropable?.()) return true;
    }
    return false;
  }

  canLootAsCorpse(from?: GameObject): boolean {
    if(!this.host.isDead() && !this.host.isRetainedCorpse) return false;
    if(this.host.getBodyBagPlaceable()) return true;
    if(from && this.host.isHostile(from)) return true;
    if(this.host.isDeadSelectable && this.host.hasLootableContents()) return true;
    return this.host.isDeadSelectable;
  }

  shouldSpawnBodyBag(): boolean {
    if(!this.host.isDestroyable) return false;
    if((this.runtime.getParty?.() ?? [])?.indexOf(this.host) >= 0) return false;
    // Use objectType check — isPlayer(this.host) type-narrows Creature to never in the false branch
    if(BitWise.InstanceOf(this.host.objectType, GameObjectType.PlayerCharacter)) return false;
    if(this.host.bodyBagObjectId) return false;

    const rule = this.host.getBodyBagRule();
    if(rule?.corpse) return true;

    if(this.host.gold > 0) return true;

    for(let i = 0; i < this.host.inventory.length; i++){
      if(this.host.inventory[i]?.isDropable?.()) return true;
    }

    const slots = Object.keys(this.host.equipment) as (keyof typeof this.host.equipment)[];
    for(let i = 0; i < slots.length; i++){
      const item = this.host.equipment[slots[i]];
      if(item?.isDropable?.()) return true;
    }

    return false;
  }

  spawnBodyBag(): number {
    if(!this.host.shouldSpawnBodyBag()) return GameObjectConstant.OBJECT_INVALID;

    const rule = this.host.getBodyBagRule();
    const bagId = Placeable.spawnBodyBagFrom(
      this.host,
      this.host.getBodyBagRowId(),
      rule,
      this.host.getBodyBagAppearance()
    );
    if(bagId !== GameObjectConstant.OBJECT_INVALID){
      this.host.bodyBagObjectId = bagId;
    }
    return bagId;
  }

  onServerDestroyEvent(){
    if(this.host.serverDestroyed || this.host.isRetainedCorpse) return;
    this.host.serverDestroyed = true;

    if(this.host.isDead() && this.host.isDestroyable && !this.host.bodyBagObjectId){
      this.host.spawnBodyBag();
    }

    const bag = this.host.getBodyBagPlaceable();
    const bagIsCorpseModel = !!bag?.isCorpse;

    // Corpse-model bags (Rancor/Krayt) show the placeable; no KeepCorpse shell
    if(this.host.keepCorpseOnDestroy && !bagIsCorpseModel){
      this.host.enterRetainedCorpse();
    }else if(bag){
      bag.setBodyBagVisible(true);
    }

    // event 0xb removes the object from GetGameObject / tag lookup so
    // GetIsObjectValid / GetObjectByTag fail (k_ptar_ramp Calo082 gate). KeepCorpse
    // shells stay in area.creatures for visuals only.
    this.runtime.remove(this.host);
    // Fade path continues via willDestroy / updateDestroyFade → destroy
  }

  enterRetainedCorpse(){
    if(this.host.isRetainedCorpse || this.host.destroyed) return;

    const area = this.host.area;
    this.host.isRetainedCorpse = true;
    this.host.willDestroy = false;
    this.host.keepCorpseOnDestroy = false;
    this.host.retainedCorpseFadeRemaining = -1;
    this.host.retainedCorpseFadeTotal = 0;
    this.host.setOpacity(1);

    if(area){
      area.corpseCache.add(this.host);
    }

    const bag = this.host.getBodyBagPlaceable();
    if(bag && !bag.isCorpse){
      bag.setBodyBagVisible(false);
    }

    // Hold DEAD pose
    if(this.host.animationState.index != ModuleCreatureAnimState.DEAD){
      this.host.setAnimationState(ModuleCreatureAnimState.DEAD);
      this.host.deathAnimationPlayed = true;
    }
  }

  beginRetainedCorpseFadeOut(fadeSec: number = 1.0){
    if(!this.host.isRetainedCorpse || this.host.destroyed) return;
    const bag = this.host.getBodyBagPlaceable();
    if(bag) bag.setBodyBagVisible(true);
    this.host.retainedCorpseFadeTotal = Math.max(0, fadeSec);
    this.host.retainedCorpseFadeRemaining = this.host.retainedCorpseFadeTotal;
    if(this.host.retainedCorpseFadeRemaining <= 0){
      this.host.disposeRetainedCorpse(false);
    }
  }

  updateRetainedCorpse(delta: number = 0){
    if(this.host.destroyed || !this.host.isRetainedCorpse) return;

    if(this.host.audioEmitter){
      this.host.audioEmitter.setPosition(this.host.position.x, this.host.position.y, this.host.position.z + 1.0);
    }

    if(this.host.retainedCorpseFadeRemaining >= 0){
      this.host.retainedCorpseFadeRemaining -= delta;
      const total = this.host.retainedCorpseFadeTotal > 0 ? this.host.retainedCorpseFadeTotal : 1;
      const opacity = Math.max(0, this.host.retainedCorpseFadeRemaining / total);
      this.host.setOpacity(opacity);
      Object.values(this.host.equipment).forEach(item => {
        if(item && item.model instanceof OdysseyModel3D){
          item.model.setOpacity(opacity);
        }
      });
      if(this.host.retainedCorpseFadeRemaining <= 0){
        this.host.setOpacity(0);
        this.host.disposeRetainedCorpse(false);
        return;
      }
    }

    this.host.updateAnimationState();
    if(this.host.model instanceof OdysseyModel3D && this.host.model.bonesInitialized){
      this.host.model.animateFrame = true;
      this.host.model.update(delta);
    }
  }

  clearCorpseDestroyState(){
    const wasScriptHidden = !!(this.host.isRetainedCorpse || this.host.serverDestroyed);
    const stillInObjectList = GameState.GameObjectManager.ObjectList.has(this.host.id);
    if(this.host.isRetainedCorpse){
      const area = this.host.area;
      area?.corpseCache?.remove(this.host);
      this.host.isRetainedCorpse = false;
    }
    this.host.corpseDestroyScheduled = false;
    this.host.serverDestroyed = false;
    this.host.keepCorpseOnDestroy = false;
    this.host.retainedCorpseFadeRemaining = -1;
    this.host.retainedCorpseFadeTotal = 0;
    this.host.setWillDestroy(false);
    this.host.setDelayUntilDestroy(0);
    this.host.setDelayUntilFade(0);
    this.host.setNoFadeOnDestroy(false);
    this.host.setOpacity(1);
    // Party TempDeath revive after KeepCorpse removed the object from script tables
    if(wasScriptHidden && !stillInObjectList){
      getDefaultRuntimeContext().register(this.host);
    }
  }

  disposeRetainedCorpse(revealBag: boolean = false){
    if(this.host.destroyed) return;
    const area = this.host.area;
    area?.corpseCache?.remove(this.host);

    if(revealBag){
      const bag = this.host.getBodyBagPlaceable();
      if(bag) bag.setBodyBagVisible(true);
    }

    this.host.isRetainedCorpse = false;
    this.host.willDestroy = false;
    this.host.serverDestroyed = true;
    GameObject.prototype.destroy.call(this.host);
    this.host.disposeCreatureVisuals();
  }

  updateDestroyFade(delta: number = 0): void {
    if(this.host.destroyed || this.host.isRetainedCorpse) return;

    // EventHandler destroy (0xb) — fires at DestroyObjectDelay
    if(!this.host.serverDestroyed && this.host.timeSinceDestroyStarted >= this.host.delayUntilFade){
      this.host.onServerDestroyEvent();
      // KeepCorpse converts to retained shell — stop the destroy timer path
      if(this.host.isRetainedCorpse) return;
    }

    GameObject.prototype.updateDestroyFade.call(this.host, delta);
    if(this.host.noFadeOnDestroy) return;
    if(this.host.timeSinceDestroyStarted >= this.host.delayUntilFade){
      const fadeElapsed = this.host.timeSinceDestroyStarted - this.host.delayUntilFade;
      const fadeLen = this.host.getFadeDuration();
      const opacity = fadeLen > 0 ? Math.max(0, 1 - (fadeElapsed / fadeLen)) : 0;
      Object.values(this.host.equipment).forEach(item => {
        if(item && item.model instanceof OdysseyModel3D){
          item.model.setOpacity(opacity);
        }
      });
    }
  }

  destroy(): void {
    if(this.host.destroyed) return;

    // KeepCorpse shell — only disposeRetainedCorpse / cache eviction tears it down
    if(this.host.isRetainedCorpse){
      return;
    }

    // EventHandler destroy (0xb)
    this.host.unlinkFromEncounter(false);

    if(!this.host.serverDestroyed){
      this.host.onServerDestroyEvent();
      if(this.host.isRetainedCorpse){
        // Converted to KeepCorpse shell — do not dispose visuals
        return;
      }
    }

    GameObject.prototype.destroy.call(this.host);
    this.host.disposeCreatureVisuals();
  }

  disposeCreatureVisuals(){
    if(this.host.head instanceof OdysseyModel3D){
      if(this.host.head.parent instanceof THREE.Object3D){
        this.host.head.removeFromParent();
      }
      this.host.head.dispose();
      this.host.head = undefined;
    }

    if(this.host.equipment.ARMOR){
      this.host.equipment.ARMOR.destroy();
      this.host.equipment.ARMOR = undefined;
    }

    if(this.host.equipment.ARMS){
      this.host.equipment.ARMS.destroy();
      this.host.equipment.ARMS = undefined;
    }

    if(this.host.equipment.BELT){
      this.host.equipment.BELT.destroy();
      this.host.equipment.BELT = undefined;
    }

    if(this.host.equipment.CLAW1){
      this.host.equipment.CLAW1.destroy();
      this.host.equipment.CLAW1 = undefined;
    }

    if(this.host.equipment.CLAW2){
      this.host.equipment.CLAW2.destroy();
      this.host.equipment.CLAW2 = undefined;
    }

    if(this.host.equipment.CLAW3){
      this.host.equipment.CLAW3.destroy();
      this.host.equipment.CLAW3 = undefined;
    }

    if(this.host.equipment.HEAD){
      this.host.equipment.HEAD.destroy();
      this.host.equipment.HEAD = undefined;
    }

    if(this.host.equipment.HIDE){
      this.host.equipment.HIDE.destroy();
      this.host.equipment.HIDE = undefined;
    }

    if(this.host.equipment.IMPLANT){
      this.host.equipment.IMPLANT.destroy();
      this.host.equipment.IMPLANT = undefined;
    }

    if(this.host.equipment.LEFTARMBAND){
      this.host.equipment.LEFTARMBAND.destroy();
      this.host.equipment.LEFTARMBAND = undefined;
    }

    if(this.host.equipment.LEFTHAND){
      this.host.equipment.LEFTHAND.destroy();
      this.host.equipment.LEFTHAND = undefined;
    }

    if(this.host.equipment.LEFTHAND2){
      this.host.equipment.LEFTHAND2.destroy();
      this.host.equipment.LEFTHAND2 = undefined;
    }

    if(this.host.equipment.RIGHTARMBAND){
      this.host.equipment.RIGHTARMBAND.destroy();
      this.host.equipment.RIGHTARMBAND = undefined;
    }

    if(this.host.equipment.RIGHTHAND){
      this.host.equipment.RIGHTHAND.destroy();
      this.host.equipment.RIGHTHAND = undefined;
    }

    if(this.host.equipment.RIGHTHAND2){
      this.host.equipment.RIGHTHAND2.destroy();
      this.host.equipment.RIGHTHAND2 = undefined;
    }

    while(this.host.inventory.length){
      const item = this.host.inventory[0];
      if(item){
        item.destroy();
      }
      this.host.inventory.splice(0, 1);
    }
    
    GameState.FactionManager.RemoveCreatureFromFaction(this.host);

    if(this.host.debugLabel){
      this.host.debugLabel.dispose();
    }
  }

  unlinkFromEncounter(fromDestroySelf: boolean = false){
    if(this.host.encounterUnlinked) return;
    if(this.host.encounterObjectId === GameObjectConstant.OBJECT_INVALID) return;

    const encounter = this.runtime.getById(this.host.encounterObjectId);
    if(
      encounter &&
      isEncounter(encounter)
    ){
      (encounter as Encounter).removeFromActiveCreatureCount(
        this.host.challengeRating || 0,
        fromDestroySelf ? 1 : 0
      );
    }
    this.host.encounterUnlinked = true;
  }
}
