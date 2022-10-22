/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton } from "../../../gui";
import { MenuGalaxyMap as K1_MenuGalaxyMap } from "../../kotor/KOTOR";

/* @file
* The MenuGalaxyMap menu class.
*/

export class MenuGalaxyMap extends K1_MenuGalaxyMap {

  declare LBL_BAR2: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare _3D_PlanetDisplay: GUILabel;
  declare LBL_Planet_MalachorV: GUIButton;
  declare LBL_Planet_Dantooine: GUIButton;
  declare LBL_Planet_NarShaddaa: GUIButton;
  declare LBL_Planet_PeragusII: GUIButton;
  declare LBL_Planet_Dxun: GUIButton;
  declare LBL_Planet_Korriban: GUIButton;
  declare LBL_Planet_Telos: GUIButton;
  declare LBL_Planet_Onderon: GUIButton;
  declare LBL_Planet_M478: GUIButton;
  declare LBL_Tutorial: GUIButton;
  declare _3D_PlanetModel: GUILabel;
  declare LBL_PLANETNAME: GUILabel;
  declare LBL_DESC: GUILabel;
  declare BTN_ACCEPT: GUIButton;
  declare BTN_BACK: GUIButton;
  declare LBL_Planet_Citadel: GUIButton;
  declare LBL_EbonHawk: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'galaxymap_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
