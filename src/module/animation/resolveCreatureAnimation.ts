/**
 * Creature animation-constant → animations.2da row resolution
 * (ServerToClientAnimation).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file resolveCreatureAnimation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';
import type { SWAnimation } from '@/engine/rules/SWAnimation';
import type { CreatureAnimationContext } from '@/module/animation/CreatureAnimationContext';
import {
  readyAnimationRow,
  damagedAnimationRow,
  blasterDeflection1HAnimationRow,
  blasterDeflection2HAnimationRow,
  meleeWieldAnimationRow,
  meleeCombatWieldAnimationRow,
  flourishAnimationRow,
} from '@/module/animation/combat-wield-digit';

/**
 * Fixed constant → 2DA row index mappings (no creature runtime state).
 * Row 0 is a valid walk default — always test with `!== undefined`.
 */
const DIRECT_ANIMATION_ROWS: Partial<Record<ModuleCreatureAnimState, number>> = {
  [ModuleCreatureAnimState.PAUSE_BORED]: 13,
  [ModuleCreatureAnimState.PAUSE_TIRED]: 14,
  [ModuleCreatureAnimState.PAUSE_DRUNK]: 15,
  [ModuleCreatureAnimState.PAUSE_INJ]: 8,
  [ModuleCreatureAnimState.DIE1]: 82,
  [ModuleCreatureAnimState.GET_UP_DEAD]: 381,
  [ModuleCreatureAnimState.GET_UP_DEAD1]: 382,
  [ModuleCreatureAnimState.RUN_INJ]: 4,
  // ServerToClientAnimation: fixed 302 for all creature types
  [ModuleCreatureAnimState.DODGE]: 302,
  // ServerToClientAnimation: fixed 301 (not dodge 302)
  [ModuleCreatureAnimState.PARRY]: 301,
  [ModuleCreatureAnimState.GREETING]: 31,
  [ModuleCreatureAnimState.LISTEN]: 18,
  [ModuleCreatureAnimState.LISTEN_INJURED]: 371,
  [ModuleCreatureAnimState.TALK_NORMAL]: 25,
  [ModuleCreatureAnimState.TALK_PLEADING]: 27,
  [ModuleCreatureAnimState.TALK_FORCEFUL]: 26,
  [ModuleCreatureAnimState.TALK_LAUGHING]: 29,
  [ModuleCreatureAnimState.TALK_SAD]: 28,
  [ModuleCreatureAnimState.TALK_INJURED]: 370,
  [ModuleCreatureAnimState.SALUTE]: 16,
  [ModuleCreatureAnimState.BOW]: 19,
  [ModuleCreatureAnimState.GET_LOW]: 40,
  [ModuleCreatureAnimState.GET_MID]: 41,
  [ModuleCreatureAnimState.INJECT]: 37,
  [ModuleCreatureAnimState.DAMAGE]: 303,
  [ModuleCreatureAnimState.USE_COMPUTER_LP]: 44,
  [ModuleCreatureAnimState.WHIRLWIND]: 75,
  [ModuleCreatureAnimState.DEACTIVATE]: 270,
  [ModuleCreatureAnimState.FLIRT]: 32,
  [ModuleCreatureAnimState.USE_COMPUTER]: 43,
  [ModuleCreatureAnimState.DANCE]: 53,
  [ModuleCreatureAnimState.DANCE1]: 54,
  [ModuleCreatureAnimState.HORROR]: 74,
  [ModuleCreatureAnimState.USE_COMPUTER2]: 43,
  [ModuleCreatureAnimState.PERSUADE]: 68,
  [ModuleCreatureAnimState.ACTIVATE_ITEM]: 38,
  [ModuleCreatureAnimState.UNLOCK_DOOR]: 47,
  [ModuleCreatureAnimState.THROW_HIGH]: 57,
  [ModuleCreatureAnimState.THROW_LOW]: 58,
  [ModuleCreatureAnimState.UNLOCK_CONTAINER]: 48,
  [ModuleCreatureAnimState.DISABLE_MINE]: 51,
  [ModuleCreatureAnimState.WALK_STEALTH]: 5,
  [ModuleCreatureAnimState.UNLOCK_DOOR2]: 47,
  [ModuleCreatureAnimState.UNLOCK_CONTAINER2]: 48,
  [ModuleCreatureAnimState.ACTIVATE_ITEM2]: 38,
  [ModuleCreatureAnimState.SLEEP]: 76,
  [ModuleCreatureAnimState.PARALYZED]: 78,
  [ModuleCreatureAnimState.PRONE]: 79,
  [ModuleCreatureAnimState.SET_MINE]: 52,
  [ModuleCreatureAnimState.DISABLE_MINE2]: 51,
  [ModuleCreatureAnimState.CUSTOM01]: 346,
  [ModuleCreatureAnimState.FBLOCK]: 355,
  [ModuleCreatureAnimState.WELD]: 360,
  [ModuleCreatureAnimState.TREAT_INJURED]: 34,
  [ModuleCreatureAnimState.TREAT_INJURED_LP]: 35,
  [ModuleCreatureAnimState.CATCH_SABER]: 71,
  [ModuleCreatureAnimState.THROW_SABER_LP]: 70,
  [ModuleCreatureAnimState.THROW_SABER]: 69,
  [ModuleCreatureAnimState.KNEEL_TALK_ANGRY]: 384,
  [ModuleCreatureAnimState.KNEEL_TALK_SAD]: 385,
  [ModuleCreatureAnimState.KNOCKED_DOWN]: 85,
  [ModuleCreatureAnimState.KNOCKED_DOWN2]: 85,
  [ModuleCreatureAnimState.DEAD_PRONE]: 375,
  [ModuleCreatureAnimState.KNEEL]: 23,
  [ModuleCreatureAnimState.KNEEL1]: 23,
  // BEGIN TSL ANIMATIONS
  [ModuleCreatureAnimState.TOUCH_HEART]: 462,
  [ModuleCreatureAnimState.ROLL_EYES]: 463,
  [ModuleCreatureAnimState.USE_ITEM_ON_OTHER]: 464,
  [ModuleCreatureAnimState.STAND_ATTENTION]: 465,
  [ModuleCreatureAnimState.NOD_YES]: 466,
  [ModuleCreatureAnimState.NOD_NO]: 467,
  [ModuleCreatureAnimState.POINT]: 468,
  [ModuleCreatureAnimState.POINT_LP]: 469,
  [ModuleCreatureAnimState.POINT_DOWN]: 470,
  [ModuleCreatureAnimState.SCANNING]: 471,
  [ModuleCreatureAnimState.SHRUG]: 472,
  [ModuleCreatureAnimState.SIT_CHAIR]: 316,
  [ModuleCreatureAnimState.SIT_CHAIR_DRUNK]: 317,
  [ModuleCreatureAnimState.SIT_CHAIR_PAZAAK]: 318,
  [ModuleCreatureAnimState.SIT_CHAIR_COMP1]: 316,
  [ModuleCreatureAnimState.SIT_CHAIR_COMP2]: 316,
  [ModuleCreatureAnimState.CUT_HANDS]: 557,
  [ModuleCreatureAnimState.L_HAND_CHOP]: 558,
  [ModuleCreatureAnimState.COLLAPSE]: 559,
  [ModuleCreatureAnimState.COLLAPSE_LP]: 560,
  [ModuleCreatureAnimState.COLLAPSE_STAND]: 561,
  [ModuleCreatureAnimState.BAO_DUR_POWER_PUNCH]: 562,
  [ModuleCreatureAnimState.POINT_UP]: 563,
  [ModuleCreatureAnimState.POINT_UP_LOWER]: 564,
  [ModuleCreatureAnimState.HOOD_OFF]: 565,
  [ModuleCreatureAnimState.HOOD_ON]: 566,
  [ModuleCreatureAnimState.DIVE_ROLL]: 567,
  // END TSL ANIMATIONS
};

function resolveWeaponWalkRow(weaponType: number): number {
  switch(weaponType){
    case 2: return 338;
    case 3: return 341;
    case 4: return 339;
    case 7:
    case 9: return 340;
    default: return 0;
  }
}

function resolveWeaponRunRow(weaponType: number): number {
  // ServerToClientAnimation 0x2714 — rifle/heavy (7/9) → runRF (0x156),
  // not walkRF (0x154). Stun baton (1) falls through to default run.
  switch(weaponType){
    case 2: return 345;
    case 3: return 343;
    case 4: return 3;
    case 7:
    case 9: return 342;
    default: return 2;
  }
}

/**
 * Resolve a creature animation constant to an animations.2da row.
 * Deterministic and side-effect free aside from an unhandled-constant warn.
 */
export function resolveCreatureAnimation(
  animationConstant: number,
  context: CreatureAnimationContext,
  animations: readonly SWAnimation[],
): SWAnimation | undefined {
  const directRow = DIRECT_ANIMATION_ROWS[animationConstant as ModuleCreatureAnimState];
  if(directRow !== undefined){
    return animations[directRow];
  }

  switch(animationConstant){
    case ModuleCreatureAnimState.PAUSE:
    case ModuleCreatureAnimState.PAUSE_ALT:
      if(context.poisoned || context.diseased) return animations[15];
      if(context.simple){
        return animations[256];
      }
      return context.injured ? animations[8] : animations[6];

    case ModuleCreatureAnimState.PAUSE2:
      if(context.poisoned || context.diseased) return animations[15];
      if(context.simple){
        return animations[257];
      }
      return context.injured ? animations[8] : animations[7];

    case ModuleCreatureAnimState.PAUSE3:
      if(context.poisoned || context.diseased) return animations[15];
      return context.injured ? animations[8] : animations[359];

    case ModuleCreatureAnimState.PAUSE4:
      if(context.poisoned || context.diseased) return animations[15];
      return context.injured ? animations[8] : animations[357];

    case ModuleCreatureAnimState.PAUSE_SCRATCH_HEAD:
      if(context.poisoned) return animations[15];
      if(context.simple){
        return animations[12];
      }
      return context.injured ? animations[8] : animations[7];

    case ModuleCreatureAnimState.DEAD:
      return context.simple ? animations[275] : animations[81];

    case ModuleCreatureAnimState.DEAD1:
      return context.simple ? animations[275] : animations[83];

    case ModuleCreatureAnimState.DIE:
      return context.simple ? animations[274] : animations[80];

    case ModuleCreatureAnimState.WALK_INJ:
      return context.simple ? animations[254] : animations[1];

    case ModuleCreatureAnimState.WALKING:
      if(context.simple){
        return context.injured ? animations[254] : animations[253];
      }
      if(!context.injured){
        return animations[resolveWeaponWalkRow(context.weaponType)];
      }
      return animations[1];

    // anim 0x2713 — walk-back uses same weapon walk set (reverse playback)
    case ModuleCreatureAnimState.WALKING_BACK:
      if(context.simple){
        return animations[253];
      }
      if(!context.injured){
        return animations[resolveWeaponWalkRow(context.weaponType)];
      }
      return animations[1];

    case ModuleCreatureAnimState.RUNNING:
      if(context.simple){
        return animations[255];
      }
      if(!context.injured){
        return animations[resolveWeaponRunRow(context.weaponType)];
      }
      return animations[4];

    // COMBAT READY
    case ModuleCreatureAnimState.READY:
    case ModuleCreatureAnimState.READY_ALT:
      if(context.simple){
        return animations[278];
      }
      return animations[readyAnimationRow(context.weaponType)];

    case ModuleCreatureAnimState.SPASM:
      return context.simple ? animations[268] : animations[77];

    case ModuleCreatureAnimState.TAUNT:
      return context.simple ? animations[263] : animations[33];

    case ModuleCreatureAnimState.VICTORY:
      return context.simple ? animations[260] : animations[17];

    case ModuleCreatureAnimState.HEAD_TURN_LEFT:
      return context.simple ? animations[258] : animations[11];

    case ModuleCreatureAnimState.HEAD_TURN_RIGHT:
      return context.simple ? animations[259] : animations[10];

    case ModuleCreatureAnimState.TURN_LEFT:
      return context.simple ? animations[253] : animations[290];

    case ModuleCreatureAnimState.TURN_RIGHT:
      return context.simple ? animations[253] : animations[291];

    case ModuleCreatureAnimState.DAMAGED:
      return animations[damagedAnimationRow(context.weaponType)];

    case ModuleCreatureAnimState.BLASTER_DEFLECTION_1H:
      return animations[blasterDeflection1HAnimationRow(context.weaponType)];

    case ModuleCreatureAnimState.BLASTER_DEFLECTION_2H:
      return animations[blasterDeflection2HAnimationRow(context.weaponType)];

    case ModuleCreatureAnimState.CHOKE:
      return context.simple ? animations[264] : animations[72];

    // MELEE_WIELD (10157 / 0x27ad) — SetOverlayAnimation while moving (PlayerFlourishWeapons).
    case ModuleCreatureAnimState.MELEE_WIELD:
      return animations[meleeWieldAnimationRow(context.weaponType)];

    // MELEE_COMBAT_WIELD (10158 / 0x27ae) — standing InsertFireForgetAnimation path.
    case ModuleCreatureAnimState.MELEE_COMBAT_WIELD:
      return animations[meleeCombatWieldAnimationRow(context.weaponType)];

    case ModuleCreatureAnimState.FLOURISH:
      return animations[flourishAnimationRow(context.weaponType)];
  }

  console.warn(`resolveCreatureAnimation: Unhandled animation constant ${animationConstant}`);
  return undefined;
}
