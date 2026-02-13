import { GameState } from "../../../GameState";
import { GUIProtoItem } from "../../../gui";
import type { GameMenu, GUIControl } from "../../../gui";
import { createScopedLogger, LogScope } from "../../../utility/Logger";

const log = createScopedLogger(LogScope.Game);
import { GFFStruct } from "../../../resource/GFFStruct";

/**
 * GUIMovieItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIMovieItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIMovieItem extends GUIProtoItem {

  declare node: any;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.extent.height = 63;
  }

  createControl(){
    try{
      this.setText(GameState.TLKManager.GetStringById(this.node.strrefname).Value);
      super.createControl();
    }catch(e){
      log.error(e);
    }
    return this.widget;
  }

}
