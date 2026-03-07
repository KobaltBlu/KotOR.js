import { MapMode } from "../../../enums/engine/MapMode";
import { LBL_MapView } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";
import type { ModuleWaypoint } from "../../../module";
import { CExoLocString } from "../../../resource/CExoLocString";
import { MenuMap as K1_MenuMap } from "../../kotor/KOTOR";

/**
 * MenuMap class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuMap.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuMap extends K1_MenuMap {

  declare LBL_Map: GUILabel;
  declare LBL_MapNote: GUILabel;
  declare BTN_RETURN: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_Area: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare BTN_EXIT: GUIButton;
  declare BTN_UP: GUIButton;
  declare BTN_DOWN: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'map_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LBL_MapNote.setText('');
      this.LBL_Map.addEventListener('click', (e) => {
        e.stopPropagation();
        const mapNote: ModuleWaypoint = this.miniMap.onClick();
        if(mapNote && mapNote.mapNote instanceof CExoLocString){
          this.LBL_MapNote.setText(mapNote.mapNote.getValue())
        }
      });

      this.BTN_RETURN.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this.BTN_RETURN.hide();

      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;

      this.miniMap = new LBL_MapView(this.LBL_Map);
      this.miniMap.setControl(this.LBL_Map);
      this.miniMap.setSize(this.LBL_Map.extent.width, this.LBL_Map.extent.height);
      this.miniMap.setMode(MapMode.FULLMAP);
      this.miniMap.scene.scale.setScalar(this.LBL_Map.extent.width/512);

      resolve();
    });
  }
  
}
