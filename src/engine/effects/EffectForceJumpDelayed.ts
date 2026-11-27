import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameEffectSetStateType } from "@core/enums/effects/GameEffectSetStateType";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameState } from "@engine/runtime/GameState";
import { desiredAttackRange } from "@engine/combat/attack-range";
import {
  computeForceJumpDestination,
  computeForceJumpTargetShoveDestination,
  installForceJumpPath,
} from "@engine/pathfinding/force-jump-loco";
import { isSafeWalkPoint } from "@engine/pathfinding/safe-walk-point";
import { CreatureLocoState } from "@engine/pathfinding/creature-loco";
import type { Creature } from "@engine/module/Creature";
import { isCreature } from "@engine/module/guards/isCreature";

/**
 * EffectForceJumpDelayed — type 0x67.
 * Leap jumper to DesiredAttackRange; if dest unsafe, shove target with loco 6 + SetState(13).
 *
 * @file EffectForceJumpDelayed.ts
 */
export class EffectForceJumpDelayed extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForceJumpDelayed;
  }

  onApply(){
    if(this.applied)
      return;

    if(!isCreature(this.object)){
      return;
    }

    const jumper = this.object as Creature;
    const target = this.getObject(0);
    if(!isCreature(target)){
      return;
    }

    super.onApply();

    jumper.setFacingObject?.(target);

    // Landing spot uses the engaged (duel) attack range.
    const desired = desiredAttackRange(jumper, target, true);
    const computed = computeForceJumpDestination(
      jumper.position,
      target.position,
      desired
    );

    let jumperDest = computed.dest;

    if(computed.ok){
      const area = jumper.area || target.area;
      const safe = isSafeWalkPoint(area, jumperDest, target);
      if(!safe){
        const shoveDesired = desiredAttackRange(
          jumper,
          target,
          !!jumper.combatRound?.engaged
        );
        const shoveEnd = computeForceJumpTargetShoveDestination(
          target.position,
          computed.dir,
          shoveDesired
        );
        jumperDest = target.position.clone();
        installForceJumpPath(
          target as Creature,
          target.position,
          shoveEnd,
          CreatureLocoState.ForceJumpTarget
        );

        const eSetState = new GameState.GameEffectFactory.EffectSetState();
        eSetState.setDurationType(GameEffectDurationType.TEMPORARY);
        eSetState.setCreator(this.getCreator() || jumper);
        eSetState.setSpellId(this.getSpellId());
        eSetState.setSkipOnLoad(true);
        eSetState.setInt(0, GameEffectSetStateType.FORCEJUMP);
        eSetState.initialize();
        (target as Creature).addEffect(eSetState);
      }
    }

    installForceJumpPath(
      jumper,
      jumper.position,
      jumperDest,
      CreatureLocoState.ForceJump
    );
  }
}
