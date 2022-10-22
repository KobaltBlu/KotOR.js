/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import { MenuMap as K1_MenuMap } from "../../kotor/KOTOR";

/* @file
* The MenuMap menu class.
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

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {

      this.BTN_RETURN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      resolve();
    });
  }

  SetMapTexture(sTexture = '') {
    this.LBL_Map.setFillTextureName(sTexture);
    TextureLoader.tpcLoader.fetch(sTexture, (texture: OdysseyTexture) => {
      this.LBL_Map.setFillTexture(texture);
    });
  }

  Show() {
    super.Show();
    GameState.MenuActive = true;
  }
  
}
