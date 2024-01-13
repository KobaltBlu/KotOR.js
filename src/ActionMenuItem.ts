import { GameState } from "./GameState";

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

  constructor( props: any = {} ){
    props = Object.assign({
      action: undefined,
      talent: undefined,
      target: GameState.ActionMenuManager.oTarget,
      icon: '',
    }, props);
    this.action = props.action;
    this.talent = props.talent;
    this.icon = props.icon;
    this.target = props.target;
  }

}