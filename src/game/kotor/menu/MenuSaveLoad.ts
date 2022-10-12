/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuSaveLoad menu class.
*/

export class MenuSaveLoad extends GameMenu {

  LB_GAMES: GUIListBox;
  LBL_PANELNAME: GUILabel;
  LBL_SCREENSHOT: GUILabel;
  LBL_PLANETNAME: GUILabel;
  LBL_PM2: GUILabel;
  LBL_AREANAME: GUILabel;
  LBL_PM1: GUILabel;
  LBL_PM3: GUILabel;
  BTN_DELETE: GUIButton;
  BTN_BACK: GUIButton;
  BTN_SAVELOAD: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'saveload';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  super.Show();
  GameState.MenuActive = true;
  this.selectedControl = this.LB_GAMES;
  this.LB_GAMES.GUIProtoItemClass = GUISaveGameItem;
  this.LB_GAMES.clearItems();
  let saves = [];
  if (this.mode == MenuSaveLoad.MODE.SAVEGAME) {
    saves = SaveGame.saves.filter(save => {
      return !save.getIsQuickSave() && !save.getIsAutoSave();
    });
    this.BTN_SAVELOAD.setText(TLKManager.TLKStrings[1587].Value);
    saves.unshift(new NewSaveItem());
  } else {
    saves = SaveGame.saves;
    this.BTN_SAVELOAD.setText(TLKManager.TLKStrings[1589].Value);
  }
  for (let i = 0; i < saves.length; i++) {
    let save = saves[i];
    this.LB_GAMES.addItem(save, null);
  }
  this.selected = saves[0];
  this.UpdateSelected();
  TextureLoader.LoadQueue();
}

UpdateSelected() {
  this.LBL_SCREENSHOT.setFillTexture(undefined);
  this.LBL_PM1.setFillTexture(undefined);
  this.LBL_PM2.setFillTexture(undefined);
  this.LBL_PM3.setFillTexture(undefined);
  this.LBL_PLANETNAME.setText('');
  this.LBL_AREANAME.setText('');
  if (this.selected instanceof SaveGame) {
    this.selected.GetThumbnail(texture => {
      this.LBL_SCREENSHOT.setFillTexture(texture);
      this.LBL_SCREENSHOT.getFill().material.transparent = false;
    });
    this.selected.GetPortrait(0, texture => {
      this.LBL_PM1.setFillTexture(texture);
      this.LBL_PM1.getFill().material.transparent = false;
    });
    this.selected.GetPortrait(1, texture => {
      this.LBL_PM2.setFillTexture(texture);
      this.LBL_PM2.getFill().material.transparent = false;
    });
    this.selected.GetPortrait(2, texture => {
      this.LBL_PM3.setFillTexture(texture);
      this.LBL_PM3.getFill().material.transparent = false;
    });
    let areaNames = this.selected.getAreaName().split(' - ');
    if (areaNames.length == 2) {
      this.LBL_PLANETNAME.setText(areaNames[0]);
      this.LBL_AREANAME.setText(areaNames[1]);
    } else {
      this.LBL_PLANETNAME.setText('');
      this.LBL_AREANAME.setText(areaNames[0]);
    }
    this.BTN_SAVELOAD.show();
    this.BTN_DELETE.show();
  } else if (this.selected instanceof NewSaveItem) {
    this.BTN_SAVELOAD.show();
    this.BTN_DELETE.hide();
  } else {
    this.BTN_SAVELOAD.hide();
    this.BTN_DELETE.hide();
  }
}

triggerControllerDUpPress() {
  this.LB_GAMES.directionalNavigate('up');
}

triggerControllerDDownPress() {
  this.LB_GAMES.directionalNavigate('down');
}
  
}
