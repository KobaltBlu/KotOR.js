import { GameState } from "@/GameState";
import type { ModuleItem } from "@/module/ModuleItem";

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
  target: any = undefined;
  action: any = undefined;
  talent: any = undefined;
  icon = '';
  item: ModuleItem;
  /** Retail field7 bit0: false → dimmed / inactive icon. */
  enabled: boolean = true;
  name: string = '';

  constructor( props: any = {} ){
    props = Object.assign({
      action: undefined,
      talent: undefined,
      target: GameState.ActionMenuManager.oTarget,
      icon: '',
      item: undefined,
      enabled: true,
      name: '',
    }, props);
    this.action = props.action;
    this.talent = props.talent;
    this.icon = props.icon;
    this.target = props.target;
    this.item = props.item;
    this.enabled = props.enabled !== false;
    this.name = props.name || '';
  }

}