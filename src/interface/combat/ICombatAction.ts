import type { AttackResult } from "../../enums/combat/AttackResult";
import type { ActionType } from "../../enums/actions/ActionType";
import type { ModuleObject } from "../../module";
import type { TalentFeat, TalentSpell } from "../../talents";
import type { Action } from "../../actions";
import type { ITwoDAAnimation } from "../twoDA/ITwoDAAnimation";

/**
 * ICombatAction interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ICombatAction.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ICombatAction {
  action?: Action,
  target: ModuleObject;
  type: ActionType;
  icon: string;
  animation: ITwoDAAnimation;
  feat?: TalentFeat,
  spell?: TalentSpell,
  isMelee?: boolean,
  isRanged?: boolean,
  hits?: boolean,
  ready: boolean,
  isCutsceneAttack?: boolean,
  attackResult?: AttackResult,
  damage?: number,
  conjureTime?: number,
  castTime?: number,
  catchTime?: number,
  completed?: boolean,
  damageCalculated?: boolean,
}