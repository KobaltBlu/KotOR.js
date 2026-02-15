import { GameState } from "@/GameState";
import { GUIProtoItem } from "@/gui";
import type { GameMenu, GUIControl } from "@/gui";
import { GFFStruct } from "@/resource/GFFStruct";
import type { ITwoDARowData } from "@/resource/TwoDAObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

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

  declare node: ITwoDARowData;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.extent.height = 63;
    log.trace('GUIMovieItem constructor', { scale });
  }

  createControl(){
    log.trace('GUIMovieItem.createControl');
    try{
      const label = GameState.TLKManager.GetStringById(this.node.strrefname).Value;
      log.debug('GUIMovieItem.createControl: setting text', { strrefname: this.node.strrefname });
      this.setText(label);
      super.createControl();
    }catch(e){
      log.error('GUIMovieItem.createControl failed', e);
    }
    return this.widget;
  }

}
