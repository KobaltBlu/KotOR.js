import type { Action } from "@/actions/Action";
import type { ActionType } from "@/enums/actions/ActionType";
import { GameState } from "@/GameState";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import type { TalentFeat } from "@/talents/TalentFeat";
import type { TalentSpell } from "@/talents/TalentSpell";


/** Inline descriptor for physical-attack-style menu actions (not a full Action instance). */
export interface ActionMenuActionDescriptor {
  type: ActionType;
  object?: ModuleObject;
  talent?: TalentFeat | TalentSpell;
}

export interface ActionMenuItemProps {
  action?: Action | ActionMenuActionDescriptor;
  talent?: TalentFeat | TalentSpell;
  target?: ModuleObject;
  icon?: string;
  item?: ModuleItem;
}

/**
 * ActionMenuItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionMenuItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionMenuItem {
  type = 0;
  target: ModuleObject | undefined = undefined;
  action: Action | ActionMenuActionDescriptor | undefined = undefined;
  talent: TalentFeat | TalentSpell | undefined = undefined;
  icon = '';
  item: ModuleItem | undefined;

  constructor( props: ActionMenuItemProps = {} ){
    const defaults: ActionMenuItemProps = {
      action: undefined,
      talent: undefined,
      target: GameState.ActionMenuManager.oTarget,
      icon: '',
      item: undefined
    };
    props = Object.assign(defaults, props);
    this.action = props.action;
    this.talent = props.talent;
    this.icon = props.icon;
    this.target = props.target;
    this.item = props.item;
  }

}
