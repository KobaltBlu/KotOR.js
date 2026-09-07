import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectSetStateType } from "@/enums/effects/GameEffectSetStateType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import { BitWise } from "@/utility/BitWise";
import { GameEffect } from "@/effects/GameEffect";
import type { ModuleCreature } from "@/module/ModuleCreature";
import {
  clipForcePushDestination,
  computeForcePushDestination,
  facingFromDirection,
  installForcePushPath,
  resolveForcePushDistance,
  resolveForcePushOrigin,
} from "@/engine/pathfinding/force-push-quick-walk";

/**
 * EffectForcePushed — effect apply (K2).
 *
 * intList[0] : bIsForcePushedTargeted
 * intList[1] : bIgnoreTestDirectLine
 * floatList[0..2] : targeted origin XYZ
 * floatList[3] : push distance (0 → 5.0)
 *
 * @file EffectForcePushed.ts
 */
export class EffectForcePushed extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectForcePushed;
  }

  onApply(){
    if(this.applied)
      return;

    if(!BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      return;
    }

    const creature = this.object as ModuleCreature;
    const creator = this.getCreator();
    const creatorOk = BitWise.InstanceOfObject(creator, ModuleObjectType.ModuleObject);
    if(!creatorOk){
      return;
    }

    const originInfo = resolveForcePushOrigin(
      this,
      creator?.position
    );
    if(!originInfo){
      return;
    }

    super.onApply();

    const distance = resolveForcePushDistance(this);
    const computed = computeForcePushDestination(
      creature.position,
      originInfo.origin,
      distance
    );

    if(computed.ok){
      const facing = facingFromDirection(computed.faceDir.x, computed.faceDir.y);
      creature.setFacing?.(facing, true);
      creature.setFacingVector?.(computed.faceDir);
    }

    const clipped = clipForcePushDestination(
      creature,
      computed.dest,
      originInfo.ignoreTestDirectLine
    );

    installForcePushPath(creature, creature.position, clipped);

    creature.fp_push_played = false;
    creature.fp_land_played = false;
    creature.fp_getup_played = false;

    const eSetState = new GameState.GameEffectFactory.EffectSetState();
    // effect apply: subtype = (copied & ~7) | TEMPORARY
    eSetState.setDurationType(GameEffectDurationType.TEMPORARY);
    eSetState.setDuration(this.getDuration());
    eSetState.setExpireDay(this.expireDay);
    eSetState.setExpireTime(this.expireTime);
    eSetState.setCreator(creator);
    eSetState.setSpellId(this.getSpellId());
    eSetState.setSkipOnLoad(true);
    eSetState.setInt(0, GameEffectSetStateType.FORCEPUSH);
    eSetState.initialize();
    creature.addEffect(eSetState);
  }
}
