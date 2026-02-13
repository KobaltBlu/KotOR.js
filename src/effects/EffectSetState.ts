import * as THREE from "three";

import { GameEffectSetStateType } from "../enums/effects/GameEffectSetStateType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";

import { GameEffect } from "./GameEffect";

/**
 * EffectSetState class.
 * State is applied once on apply; no per-frame switch. Only Force Push has ongoing movement.
 * State type = GetInteger(effect, 0). If != FORCEPUSH: clear all actions, then apply SetAIState/visual per state.
 * RecomputeAmbientAnimationState after apply. Only FORCEPUSH uses update() for position lerp.
 *
 * @file EffectSetState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectSetState extends GameEffect {
  elapsed: number;
  fp_distance: number;
  constructor() {
    super();
    this.type = GameEffectType.EffectSetState;
  }

  onApply() {
    if (this.applied)
      return;

    super.onApply();
    this.elapsed = 0;

    const stateType = this.getInt(0);
    const isForcePush = stateType === GameEffectSetStateType.FORCEPUSH;

    if (!this.object || !('setAnimationState' in this.object))
      return;

    // OnApplySetStateInternal: if state != 9, clear all actions and combat round
    if (!isForcePush) {
      if ('isCommandable' in this.object)
        this.object.isCommandable = false;
      if ('clearAllActions' in this.object && typeof this.object.clearAllActions === 'function')
        this.object.clearAllActions(true);
      const cr = 'combat_round' in this.object ? this.object.combat_round : undefined;
      if (cr && typeof (cr as { removeAllActions?: () => void }).removeAllActions === 'function')
        (cr as { removeAllActions: () => void }).removeAllActions();
    }

    // Per-state apply (mirrors OnApplySetStateInternal switch)
    switch (stateType) {
      case GameEffectSetStateType.CONFUSED:
        // case 1: default – no extra sub-effects; animation from RecomputeAmbientAnimationState
        break;
      case GameEffectSetStateType.FRIGHTENED:
        // case 2: Apply SavingThrowDecrease(2,0,race_row_count); no SetAIState in switch, goto end
        break;
      case GameEffectSetStateType.DROID_STUN:
        this.object.setAnimationState(ModuleCreatureAnimState.DAMAGE);
        break;
      case GameEffectSetStateType.CUT_SCENE_STUNNED:
        this.object.setAnimationState(ModuleCreatureAnimState.DAMAGE);
        break;
      case GameEffectSetStateType.CUT_SCENE_PARALYZE:
        this.object.setAnimationState(ModuleCreatureAnimState.PARALYZED);
        break;
      case GameEffectSetStateType.SLEEP:
        this.object.setAnimationState(ModuleCreatureAnimState.SLEEP);
        break;
      case GameEffectSetStateType.CHOKE:
        // case 7: SetAIState -3
        this.object.setAnimationState(ModuleCreatureAnimState.CHOKE);
        break;
      case GameEffectSetStateType.CUT_SCENE_HORRIFIED:
        // case 8: SetAIState -3
        this.object.setAnimationState(ModuleCreatureAnimState.HORROR);
        break;
      case GameEffectSetStateType.FORCEPUSH:
        // case 9: SetAIState -3 only; no clear actions
        break;
      case GameEffectSetStateType.WHIRLWIND:
        // case 10: SetAIState -3
        this.object.setAnimationState(ModuleCreatureAnimState.WHIRLWIND);
        break;
      default:
        break;
    }

    // RecomputeAmbientAnimationState (animation already set above where applicable)
    if (!isForcePush && 'recomputeAmbientAnimationState' in this.object && typeof (this.object as { recomputeAmbientAnimationState?: () => void }).recomputeAmbientAnimationState === 'function')
      (this.object as { recomputeAmbientAnimationState: () => void }).recomputeAmbientAnimationState();
  }

  update(delta: number = 0) {
    super.update(delta);

    // Only Force Push has ongoing position update; we mirror that here for client presentation.
    if (this.getInt(0) === GameEffectSetStateType.FORCEPUSH)
      this.updateForcePush(delta);

    this.elapsed += delta;
  }

  updateForcePush(delta: number = 0) {
    if (!this.object)
      return;
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

    if (this.elapsed < anim_push_length) {
      const f_push_move_delta = (this.elapsed / anim_push_length);
      this.object.position.copy(v1.lerp(v2, f_push_move_delta));
      this.object.box.setFromObject(this.object.model);
    } else if (this.elapsed < anim_push_length + anim_land_length) {
      this.object.position.set(
        this.getFloat(3),
        this.getFloat(4),
        this.getFloat(5)
      );
      this.object.box.setFromObject(this.object.model);
      this.object.fp_push_played = true;
    } else if (this.elapsed < anim_push_length + anim_land_length + anim_getup_length) {
      this.object.fp_land_played = true;
    } else {
      this.object.fp_getup_played = true;
    }
  }
}
