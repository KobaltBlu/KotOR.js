import type { AttackResult } from "@core/enums/combat/AttackResult";
import type { ActionType } from "@core/enums/actions/ActionType";
import type { GameObject } from "@engine/module/GameObject";
import type { TalentFeat } from "@engine/talents/TalentFeat";
import type { TalentSpell } from "@engine/talents/TalentSpell";
import type { Action } from "@engine/actions/Action";
import type { SWAnimation } from "@engine/rules/SWAnimation";

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
  target: GameObject;
  type: ActionType;
  icon: string;
  animation: SWAnimation;
  feat?: TalentFeat,
  spell?: TalentSpell,
  isMelee?: boolean,
  isRanged?: boolean,
  hits?: boolean,
  ready: boolean,
  resultsCalculated?: boolean,
  attackResult?: AttackResult,
  damage?: number,
  conjureTime?: number,
  castTime?: number,
  catchTime?: number,
  completed?: boolean,
  damageCalculated?: boolean,
}