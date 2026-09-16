import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectSetStateType } from "@/enums/effects/GameEffectSetStateType";
import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { hasImmunityType } from "@/effects/haste-slow";
import { IMMUNITY_KNOCKDOWN } from "@/effects/set-state";
import * as THREE from "three";

import { isCreature } from "@/module/guards/isCreature";

/**
 * EffectKnockdown — onApply.
 * Immunity 0x1C; pause combat; play fall anim; apply companion SetState 0x0E.
 *
 * @file EffectKnockdown.ts
 */
export class EffectKnockdown extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectKnockdown;
  }

  onApply(){
    if(this.applied)
      return;

    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;

    if(creature.plot || creature.isDead?.()){
      return;
    }
    if(hasImmunityType(creature, IMMUNITY_KNOCKDOWN)){
      return;
    }
    // skip if already in knockdown SetState 0x0E
    if(creature.hasSetState?.(GameEffectSetStateType.KNOCKDOWN)){
      return;
    }

    super.onApply();

    const round = creature.combatRound;
    if(round){
      round.infinitePause = true;
      round.pauseRound(this.getCreator() || creature, 0);
    }

    // Facing vs creator: behind (dot < 0.707) → KNOCKED_DOWN2, else KNOCKED_DOWN
    let fromBehind = false;
    const creator = this.getCreator();
    if(isCreature(creator)){
      const toSelf = creature.position.clone().sub((creator as ModuleCreature).position);
      toSelf.z = 0;
      if(toSelf.lengthSq() > 0.0001){
        toSelf.normalize();
        const facing = creature.getFacingVector?.() || new THREE.Vector3(
          Math.cos(creature.facing + Math.PI / 2),
          Math.sin(creature.facing + Math.PI / 2),
          0
        );
        facing.z = 0;
        if(facing.lengthSq() > 0.0001){
          facing.normalize();
          fromBehind = toSelf.dot(facing) < 0.707;
        }
      }
    }

    creature.setAnimationState?.(
      fromBehind ? ModuleCreatureAnimState.KNOCKED_DOWN2 : ModuleCreatureAnimState.KNOCKED_DOWN
    );

    // apply SetState type 8, int0=0x0E (companion hold)
    const setState = new GameState.GameEffectFactory.EffectSetState();
    setState.setCreator(this.getCreator() || this.creator);
    setState.setSpellId(this.getSpellId());
    setState.setDurationType(this.getDurationType());
    setState.setDuration(this.duration);
    setState.setExpireDay(this.expireDay);
    setState.setExpireTime(this.expireTime);
    setState.setSubType(GameEffectSubType.MAGICAL);
    setState.setSkipOnLoad(true);
    setState.setInt(0, GameEffectSetStateType.KNOCKDOWN);
    creature.addEffect(setState, setState.getDurationType(), setState.duration);
  }

  onRemove(){
    super.onRemove();
    if(!isCreature(this.object)){
      return;
    }
    const creature = this.object as ModuleCreature;
    const round = creature.combatRound;
    if(round){
      round.infinitePause = false;
      round.unpauseRound(this.getCreator() || creature);
    }
    if(!creature.isDead?.()){
      creature.setAnimationState?.(ModuleCreatureAnimState.READY);
    }
  }
}
