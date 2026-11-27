import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@core/enums/effects/GameEffectSubType";
import { GameEffectSetStateType } from "@core/enums/effects/GameEffectSetStateType";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import { ModuleCreatureAmbientState } from "@core/enums/module/ModuleCreatureAmbientState";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import { animForSetState, VFX_DROID_STUN, VFX_STUN } from "@engine/effects/set-state";
import { isCreature } from "@engine/module/guards/isCreature";
import {
  applyForcePushAIActivityMask,
  clearForcePushLoco,
  stampForcePushAttackSummary,
  updateForcePushAnimFlags,
} from "@engine/pathfinding/force-push-loco";

/**
 * EffectSetStateInternal — type 0x09 (onApply / onRemove).
 * Clears actions (except ForcePush), pauses combat, applies child VFX /
 * saves, and sets ambient / animation for the winning SetState.
 *
 * @file EffectSetStateInternal.ts
 */

/** States that AND activity with FORCE_PUSH_AI_ACTIVITY_MASK (0xFFFD). */
function usesRestrictedAIActivityMask(state: number): boolean {
  return (
    state === GameEffectSetStateType.CHOKE ||
    state === GameEffectSetStateType.CUT_SCENE_HORRIFIED ||
    state === GameEffectSetStateType.FORCEPUSH ||
    state === GameEffectSetStateType.WHIRLWIND ||
    state === GameEffectSetStateType.KNOCKDOWN ||
    state === GameEffectSetStateType.CRUSH ||
    state === GameEffectSetStateType.HELD ||
    state === GameEffectSetStateType.CUT_SCENE_STUNNED ||
    state === GameEffectSetStateType.MIND_TRICK ||
    state === GameEffectSetStateType.DROID_SCRAMBLE ||
    state === GameEffectSetStateType.DROID_STUN
  );
}

/** States that fire CreatureOnUserDefined onRemove. */
function firesOnUserDefined(state: number): boolean {
  return (
    state === GameEffectSetStateType.CONFUSED ||
    (state >= GameEffectSetStateType.DROID_STUN && state <= GameEffectSetStateType.WHIRLWIND) ||
    (state >= GameEffectSetStateType.KNOCKDOWN && state <= GameEffectSetStateType.DROID_SCRAMBLE)
  );
}

export class EffectSetStateInternal extends GameEffect {
  private children: GameEffect[] = [];
  elapsed = 0;

  constructor(){
    super();
    this.type = GameEffectType.EffectSetStateInternal;
  }

  onApply(){
    if(this.applied)
      return;
    if(!isCreature(this.object)){
      return;
    }
    super.onApply();

    const creature = this.object as Creature;
    const state = this.getInt(0) | 0;
    this.elapsed = 0;

    // ForcePush keeps its action queue / combat round running.
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

    if(usesRestrictedAIActivityMask(state)){
      applyForcePushAIActivityMask(creature);
    }

    this.applyAmbientAndAnim(creature, state);
  }

  update(delta: number = 0){
    super.update(delta);
    if(this.getInt(0) === GameEffectSetStateType.FORCEPUSH){
      if(isCreature(this.object)){
        const creature = this.object as Creature;
        if(!creature._creatureLocoThisFrame){
          updateForcePushAnimFlags(creature, delta);
        }
      }
    }
    this.elapsed += delta;
  }

  onRemove(){
    super.onRemove();
    if(isCreature(this.object)){
      const creature = this.object as Creature;
      const state = this.getInt(0) | 0;
      this.clearAmbient(creature, state);
      if(state === GameEffectSetStateType.FORCEPUSH){
        clearForcePushLoco(creature);
        creature.setComputedPath?.(undefined);
      }
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

      if(firesOnUserDefined(state)){
        const onUserDefined = creature.scripts?.[ScriptHook.CreatureOnUserDefined];
        onUserDefined?.run?.(creature, 0);
      }
      creature.clearVisibleList?.();
    }
    for(let i = 0; i < this.children.length; i++){
      this.object?.removeEffect?.(this.children[i]);
    }
    this.children.length = 0;
  }

  private applyAmbientAndAnim(creature: Creature, state: number){
    switch(state){
      case GameEffectSetStateType.FORCEPUSH:
        creature.ambientAnimState = ModuleCreatureAmbientState.PRONE_FORCE_PUSHED;
        {
          const creator = this.getCreator();
          if(isCreature(creator)){
            stampForcePushAttackSummary(creator as Creature, creature);
          }
        }
        break;
      case GameEffectSetStateType.FORCEJUMP:
        creature.ambientAnimState = ModuleCreatureAmbientState.PRONE_FORCE_JUMP;
        break;
      case GameEffectSetStateType.WHIRLWIND:
        creature.ambientAnimState = ModuleCreatureAmbientState.WHIRLWIND;
        creature.setAnimationState?.(animForSetState(state));
        break;
      case GameEffectSetStateType.KNOCKDOWN:
        creature.ambientAnimState = ModuleCreatureAmbientState.KNOCKDOWN;
        creature.setAnimationState?.(animForSetState(state));
        break;
      case GameEffectSetStateType.CRUSH:
        creature.ambientAnimState = ModuleCreatureAmbientState.CRUSH;
        creature.setAnimationState?.(animForSetState(state));
        break;
      case GameEffectSetStateType.CUT_SCENE_STUNNED:
      case GameEffectSetStateType.MIND_TRICK:
      case GameEffectSetStateType.DROID_SCRAMBLE:
        creature.ambientAnimState = ModuleCreatureAmbientState.PAUSE_POISONED;
        creature.setAnimationState?.(animForSetState(state));
        break;
      case GameEffectSetStateType.HELD:
        // Held resets ambient to idle; animation still uses choke lock pose.
        creature.ambientAnimState = ModuleCreatureAmbientState.IDLE;
        creature.setAnimationState?.(animForSetState(state));
        break;
      default:
        // DROID_CONFUSED leaves ambient unchanged; other states set anim only.
        creature.setAnimationState?.(animForSetState(state));
        break;
    }
  }

  private clearAmbient(creature: Creature, state: number){
    const ambient = creature.ambientAnimState | 0;
    if(state === GameEffectSetStateType.FORCEPUSH){
      if(ambient === ModuleCreatureAmbientState.PRONE_FORCE_PUSHED){
        creature.ambientAnimState = ModuleCreatureAmbientState.IDLE;
      }
    }else if(state === GameEffectSetStateType.FORCEJUMP){
      if(ambient === ModuleCreatureAmbientState.PRONE_FORCE_JUMP){
        creature.ambientAnimState = ModuleCreatureAmbientState.IDLE;
      }
    }else if(state === GameEffectSetStateType.WHIRLWIND){
      if(ambient === ModuleCreatureAmbientState.WHIRLWIND){
        creature.ambientAnimState = ModuleCreatureAmbientState.IDLE;
      }
    }else if(state === GameEffectSetStateType.KNOCKDOWN){
      if(ambient === ModuleCreatureAmbientState.KNOCKDOWN){
        creature.ambientAnimState = ModuleCreatureAmbientState.IDLE;
      }
    }else if(state === GameEffectSetStateType.CRUSH){
      if(ambient === ModuleCreatureAmbientState.CRUSH){
        creature.ambientAnimState = ModuleCreatureAmbientState.IDLE;
      }
    }else if(
      state === GameEffectSetStateType.CUT_SCENE_STUNNED ||
      state === GameEffectSetStateType.MIND_TRICK ||
      state === GameEffectSetStateType.DROID_SCRAMBLE
    ){
      if(ambient === ModuleCreatureAmbientState.PAUSE_POISONED){
        creature.ambientAnimState = ModuleCreatureAmbientState.IDLE;
      }
    }
  }

  private applyChildEffects(creature: Creature, state: number){
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
      case GameEffectSetStateType.MIND_TRICK:
      case GameEffectSetStateType.DROID_SCRAMBLE:
        this.addVfx(creature, VFX_STUN);
        break;
      default:
        break;
    }
  }

  private addSaveDecrease(
    creature: Creature,
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

  private addVfx(creature: Creature, vfxId: number){
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
}
