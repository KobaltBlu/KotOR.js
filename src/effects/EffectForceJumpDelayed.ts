import { GameEffect } from "@/effects/GameEffect";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectSetStateType } from "@/enums/effects/GameEffectSetStateType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameState } from "@/GameState";
import { desiredAttackRange } from "@/combat/attack-range";
import {
  computeForceJumpDestination,
  computeForceJumpTargetShoveDestination,
  installForceJumpPath,
} from "@/engine/pathfinding/force-jump-quick-walk";
import { testSafeLocationPoint } from "@/engine/pathfinding/test-safe-location-point";
import { QuickWalkLocoState } from "@/engine/pathfinding/quick-walk-loco";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isCreature } from "@/module/guards/isCreature";

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

    const jumper = this.object as ModuleCreature;
    const target = this.getObject(0);
    if(!isCreature(target)){
      return;
    }

    super.onApply();

    jumper.setFacingObject?.(target);

    const engaged = !!jumper.combatRound?.engaged;
    const desired = desiredAttackRange(jumper, target, engaged);
    const computed = computeForceJumpDestination(
      jumper.position,
      target.position,
      desired
    );

    let jumperDest = computed.dest;

    if(computed.ok){
      const area = jumper.area || target.area;
      const safe = testSafeLocationPoint(area, jumperDest, target);
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
          target as ModuleCreature,
          target.position,
          shoveEnd,
          QuickWalkLocoState.ForceJumpTarget
        );

        const eSetState = new GameState.GameEffectFactory.EffectSetState();
        eSetState.setDurationType(GameEffectDurationType.TEMPORARY);
        eSetState.setCreator(this.getCreator() || jumper);
        eSetState.setSpellId(this.getSpellId());
        eSetState.setSkipOnLoad(true);
        eSetState.setInt(0, GameEffectSetStateType.FORCEJUMP);
        eSetState.initialize();
        (target as ModuleCreature).addEffect(eSetState);
      }
    }

    installForceJumpPath(
      jumper,
      jumper.position,
      jumperDest,
      QuickWalkLocoState.ForceJump
    );
  }
}
