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
  startForcePushSequence,
} from "@engine/pathfinding/force-push-loco";
import {
  FORCE_PUSH_RECOVERY_AI_STATE,
  FORCE_PUSH_RECOVERY_DURATION,
} from "@engine/module/creature/ai-state";

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
    startForcePushSequence(creature);

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

  onRemove(){
    super.onRemove();
    if(!isCreature(this.object)) return;
    // The target stays dazed after the push: no attacks, no powers and
    // flat-footed for a short window.
    const eAIState = new GameState.GameEffectFactory.EffectSetAIState();
    eAIState.setDurationType(GameEffectDurationType.TEMPORARY);
    eAIState.setDuration(FORCE_PUSH_RECOVERY_DURATION);
    const future = GameState.module?.timeManager?.getFutureTimeFromSeconds(FORCE_PUSH_RECOVERY_DURATION);
    if(future){
      eAIState.setExpireDay(future.pauseDay);
      eAIState.setExpireTime(future.pauseTime);
    }else{
      // No module clock: still give the timer a non-zero expiry so it counts down.
      eAIState.setExpireTime(1);
    }
    eAIState.setSkipOnLoad(true);
    eAIState.setInt(0, FORCE_PUSH_RECOVERY_AI_STATE);
    eAIState.initialize();
    this.object.addEffect(eAIState);
  }
}
