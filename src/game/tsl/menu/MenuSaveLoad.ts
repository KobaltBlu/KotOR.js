import { GameState } from "../../../GameState";
import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { Module } from "../../../module";
import { SaveGame } from "../../../SaveGame";
import { MenuSaveLoad as K1_MenuSaveLoad, NewSaveItem } from "../../kotor/KOTOR";
import { MenuSaveLoadMode } from "../../../enums/gui/MenuSaveLoadMode";

/**
 * MenuSaveLoad class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSaveLoad.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSaveLoad extends K1_MenuSaveLoad {

  declare LBL_BAR4: GUILabel;
  declare LBL_PANELNAME: GUILabel;
  declare LBL_SCREENSHOT: GUILabel;
  declare LBL_PLANETNAME: GUILabel;
  declare LBL_PM2: GUILabel;
  declare LBL_AREANAME: GUILabel;
  declare LBL_PM1: GUILabel;
  declare LBL_PM3: GUILabel;
  declare LBL_PCNAME: GUILabel;
  declare LBL_TIMEPLAYED: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LB_GAMES: GUIListBox;
  declare BTN_BACK: GUIButton;
  declare BTN_SAVELOAD: GUIButton;
  declare BTN_DELETE: GUIButton;
  declare BTN_FILTER: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'saveload_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_SAVELOAD.setText('Load');
      this.BTN_SAVELOAD.addEventListener('click', (e: any) => {
        e.stopPropagation();
        const savegame = this.selected;
        if(this.mode == MenuSaveLoadMode.LOADGAME){
          if(savegame instanceof SaveGame){
            this.manager.ClearMenus();
            if(GameState.module instanceof Module){
              GameState.module.dispose();
              GameState.module = undefined;
            }
            savegame.Load()
          }
        }else{
          if(savegame instanceof NewSaveItem){
            this.manager.MenuSaveName.show();
            this.manager.MenuSaveName.onSave = ( name = '' ) => {
              console.log('SaveGame', name);
            };
          }else{

          }
        }
      });
      this._button_a = this.BTN_SAVELOAD;

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.LB_GAMES.onSelected = (save: SaveGame) => {
        this.selected = save;
        this.UpdateSelected();
      }

      this.tGuiPanel.getFill().position.z = -1;
      resolve();
    });
  }
  
}
