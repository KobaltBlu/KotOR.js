import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { BitWise } from "@/utility/BitWise";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { hasImmunityType } from "@/effects/haste-slow";
import * as THREE from "three";

/**
 * EffectKnockdown — retail OnApplyKnockdown @ 004d99b0 / OnRemove @ 004d9c50.
 * Immunity 0x1C; pause combat round; play knockdown anim (front/back);
 * OnRemove unpause + get-up.
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

    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }
    const creature = this.object as ModuleCreature;

    if(creature.plot || creature.isDead?.()){
      return;
    }
    // IMMUNITY_TYPE_KNOCKDOWN = 0x1C
    if(hasImmunityType(creature, 0x1C)){
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
    if(BitWise.InstanceOfObject(creator, ModuleObjectType.ModuleCreature)){
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
  }

  onRemove(){
    super.onRemove();
    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
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
