import { GameState } from "../../GameState";
import type { ModuleItem } from "../../module";

const STR_EQUIPPED = 32346;

/**
 * GUIItemEquipped class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIItemEquipped.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIItemEquipped {
  node: ModuleItem;
  equipped: boolean = true;
  constructor(node: ModuleItem){
    this.node = node;
  }

  getIcon(){
    return this.node.getIcon();
  }

  getStackSize(){
    return 1;
  }

  getName(){
    return `${this.node.getName()} (${GameState.TLKManager.GetStringById(STR_EQUIPPED).Value})`;
  }

}