import { GameState } from "../../GameState";

const STR_NONE = 363;

/**
 * GUIItemNone class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIItemNone.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIItemNone {
  constructor(){
    // super()
  }

  getIcon(){
    return 'inone';
  }

  getStackSize(){
    return 1;
  }

  getName(){
    //None String
    return GameState.TLKManager.GetStringById(STR_NONE).Value;
  }

}