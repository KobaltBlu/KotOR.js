import { AttackResult } from "../../enums/combat/AttackResult";
import { ActionType } from "../../enums/actions/ActionType";
import { ModuleObject } from "../../module";
import { TalentFeat, TalentSpell } from "../../talents";
import { Action } from "../../actions";

export interface CombatAction {
  action?: Action,
  target: ModuleObject;
  type: ActionType;
  icon: string;
  animation: string;
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
}