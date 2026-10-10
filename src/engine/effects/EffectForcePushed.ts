import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectSetStateType } from "@core/enums/effects/GameEffectSetStateType";
import { GameState } from "@engine/runtime/GameState";
import { GameEffect } from "@engine/effects/GameEffect";
import type { Creature } from "@engine/module/Creature";
import { isCreature } from "@engine/module/guards/isCreature";
import { isGameObject } from "@engine/module/guards/isGameObject";
import {
  clipForcePushDestination,
  computeForcePushDestination,
  facingFromDirection,
  installForcePushPath,
  resolveForcePushDistance,
  resolveForcePushOrigin,
} from "@engine/pathfinding/force-push-loco";

/**
 * EffectForcePushed — onApply (K2).
 * Resolves push origin / distance, installs a 2-point slide path, then
 * applies a temporary FORCEPUSH SetState on the target.
 *
 * int[0] : targeted origin (non-zero) vs creator-origin push
 * int[1] : skip walk-line clear / hasWalkLineClear clip when targeted
 * float[0..2] : targeted origin XYZ
 * float[3] : push distance (0 → default 5.0)
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

    if(!isCreature(this.object)){
      return;
    }

    const creature = this.object as Creature;
    const creator = this.getCreator();
    const creatorOk = isGameObject(creator);
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
      originInfo.ignoreWalkLineClear
    );

    installForcePushPath(creature, creature.position, clipped);

    creature.fp_push_played = false;
    creature.fp_land_played = false;
    creature.fp_getup_played = false;

    const eSetState = new GameState.GameEffectFactory.EffectSetState();
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
