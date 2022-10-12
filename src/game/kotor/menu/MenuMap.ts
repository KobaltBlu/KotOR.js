/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuMap menu class.
*/

export class MenuMap extends GameMenu {

  LBL_Map: GUILabel;
  LBL_MapNote: GUILabel;
  LBL_Area: GUILabel;
  LBL_COMPASS: GUILabel;
  BTN_UP: GUIButton;
  BTN_DOWN: GUIButton;
  BTN_PRTYSLCT: GUIButton;
  BTN_RETURN: GUIButton;
  BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'map';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

SetMapTexture(sTexture = '') {
  this.LBL_Map.setFillTextureName(sTexture);
  TextureLoader.tpcLoader.fetch(sTexture, texture => {
    this.LBL_Map.setFillTexture(texture);
  });
}

Show() {
  super.Show();
  GameState.MenuTop.LBLH_MAP.onHoverIn();
  GameState.MenuActive = true;
  if (this.onOpenScript instanceof NWScriptInstance)
    this.onOpenScript.run();
}

triggerControllerBumperLPress() {
  GameState.MenuTop.BTN_JOU.click();
}

triggerControllerBumperRPress() {
  GameState.MenuTop.BTN_OPT.click();
}
  
}
