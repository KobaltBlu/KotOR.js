import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
import { GameEffectSetStateType } from "@/enums/effects/GameEffectSetStateType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { animForSetState, VFX_DROID_STUN, VFX_STUN } from "@/effects/set-state";
import * as THREE from "three";

/**
 * EffectSetStateInternal — retail type 0x09 (OnApplySetStateInternal @ 004da330).
 * Clears actions (except ForcePush), pauses combat, applies child VFX/saves, sets anim.
 *
 * @file EffectSetStateInternal.ts
 */
export class EffectSetStateInternal extends GameEffect {
  private children: GameEffect[] = [];
  elapsed = 0;
  fp_distance = 0;

  constructor(){
    super();
    this.type = GameEffectType.EffectSetStateInternal;
  }

  onApply(){
    if(this.applied)
      return;
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    super.onApply();

    const creature = this.object as ModuleCreature;
    const state = this.getInt(0) | 0;
    this.elapsed = 0;

    // Retail: ClearAllActions + RemoveAllActions except ForcePush (state 9)
    if(state !== GameEffectSetStateType.FORCEPUSH){
      creature.clearAllActions?.(true);
      creature.combatRound?.clearActions?.();
    }

    const round = creature.combatRound;
    if(round && state !== GameEffectSetStateType.FORCEPUSH){
      round.infinitePause = true;
      round.pauseRound(this.getCreator() || creature, 0);
    }

    this.applyChildEffects(creature, state);

    if(state !== GameEffectSetStateType.FORCEPUSH){
      creature.setAnimationState?.(animForSetState(state));
    }
  }

  update(delta: number = 0){
    super.update(delta);
    if(this.getInt(0) === GameEffectSetStateType.FORCEPUSH){
      this.updateForcePush(delta);
    }
    this.elapsed += delta;
  }

  onRemove(){
    super.onRemove();
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      const creature = this.object as ModuleCreature;
      const state = this.getInt(0) | 0;
      const round = creature.combatRound;
      if(round){
        round.infinitePause = false;
        round.unpauseRound(this.getCreator() || creature);
      }
      if(!creature.isDead?.()){
        creature.setAnimationState?.(
          creature.combatData?.combatState
            ? ModuleCreatureAnimState.READY
            : ModuleCreatureAnimState.PAUSE
        );
      }

      // Retail OnRemoveSetStateInternal @ 004da870 —
      // OnUserDefined for states 1,3–10 (not FRIGHTENED=2); then ClearVisibleList.
      if(
        state === GameEffectSetStateType.CONFUSED ||
        (state >= GameEffectSetStateType.DROID_STUN && state <= GameEffectSetStateType.WHIRLWIND)
      ){
        const onUserDefined = creature.scripts?.[ModuleObjectScript.CreatureOnUserDefined];
        onUserDefined?.run?.(creature, 0);
      }
      creature.clearVisibleList?.();
    }
    for(let i = 0; i < this.children.length; i++){
      this.object?.removeEffect?.(this.children[i]);
    }
    this.children.length = 0;
  }

  private applyChildEffects(creature: ModuleCreature, state: number){
    const raceCount = GameState.SWRuleSet?.racialTypeCount ?? 0;

    switch(state){
      case GameEffectSetStateType.FRIGHTENED:
        this.addSaveDecrease(creature, 2, 0, raceCount);
        break;
      case GameEffectSetStateType.DROID_STUN:
        this.addVfx(creature, VFX_DROID_STUN);
        this.addSaveDecrease(creature, 2, 0, raceCount);
        break;
      case GameEffectSetStateType.CUT_SCENE_STUNNED:
        this.addVfx(creature, VFX_STUN);
        break;
      default:
        break;
    }
  }

  private addSaveDecrease(
    creature: ModuleCreature,
    amount: number,
    saveType: number,
    raceCount: number
  ){
    const save = new GameState.GameEffectFactory.EffectSavingThrowDecrease();
    this.stampChild(save);
    save.setInt(0, amount);
    save.setInt(1, saveType);
    save.setInt(3, raceCount);
    creature.addEffect(save, this.getDurationType(), this.duration);
    this.children.push(save);
  }

  private addVfx(creature: ModuleCreature, vfxId: number){
    try{
      const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
      this.stampChild(vfx);
      vfx.setInt(0, vfxId);
      creature.addEffect(vfx, this.getDurationType(), this.duration);
      this.children.push(vfx);
    }catch(_e){ /* optional */ }
  }

  private stampChild(child: GameEffect){
    child.setCreator(this.getCreator() || this.creator);
    child.setSpellId(this.getSpellId());
    child.setDurationType(this.getDurationType() || GameEffectDurationType.TEMPORARY);
    child.setDuration(this.duration);
    child.setExpireDay(this.expireDay);
    child.setExpireTime(this.expireTime);
    child.setSubType(GameEffectSubType.MAGICAL);
    child.setSkipOnLoad(true);
  }

  /** Ported from prior EffectSetState ForcePush motion. */
  private updateForcePush(delta: number = 0){
    if(!this.object) return;
    const v1 = new THREE.Vector3(
      this.getFloat(0),
      this.getFloat(1),
      this.getFloat(2)
    );
    const v2 = new THREE.Vector3(
      this.getFloat(3),
      this.getFloat(4),
      this.getFloat(5)
    );
    this.fp_distance = this.getFloat(6);

    const anim_push_length = 0.4666600227355957 * (this.fp_distance / 5);
    const anim_land_length = 1.0666699409484863;
    const anim_getup_length = 1.466670036315918;

    if(this.elapsed < anim_push_length){
      const f_push_move_delta = (this.elapsed / anim_push_length);
      this.object.position.copy(v1.lerp(v2, f_push_move_delta));
      this.object.box?.setFromObject?.(this.object.model);
    }else if(this.elapsed < anim_push_length + anim_land_length){
      this.object.position.set(
        this.getFloat(3),
        this.getFloat(4),
        this.getFloat(5)
      );
      this.object.box?.setFromObject?.(this.object.model);
      this.object.fp_push_played = true;
    }else if(this.elapsed < anim_push_length + anim_land_length + anim_getup_length){
      this.object.fp_land_played = true;
    }else{
      this.object.fp_getup_played = true;
    }
  }
}
