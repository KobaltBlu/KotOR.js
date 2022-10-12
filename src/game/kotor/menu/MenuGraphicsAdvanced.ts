/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton, GUICheckBox } from "../../../gui";

/* @file
* The MenuGraphicsAdvanced menu class.
*/

export class MenuGraphicsAdvanced extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_CANCEL: GUIButton;
  BTN_BACK: GUIButton;
  BTN_ANTIALIAS: GUIButton;
  BTN_ANTIALIASLEFT: GUIButton;
  BTN_ANTIALIASRIGHT: GUIButton;
  BTN_ANISOTROPY: GUIButton;
  BTN_ANISOTROPYLEFT: GUIButton;
  BTN_ANISOTROPYRIGHT: GUIButton;
  BTN_TEXQUAL: GUIButton;
  BTN_TEXQUALLEFT: GUIButton;
  BTN_TEXQUALRIGHT: GUIButton;
  CB_FRAMEBUFF: GUICheckBox;
  CB_VSYNC: GUICheckBox;
  CB_SOFTSHADOWS: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optgraphicsadv';
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
  this.updateTextureQualityLabel();
  this.BTN_ANTIALIAS.hide();
  this.BTN_ANTIALIASLEFT.hide();
  this.BTN_ANTIALIASRIGHT.hide();
  this.BTN_ANISOTROPY.hide();
  this.BTN_ANISOTROPYLEFT.hide();
  this.BTN_ANISOTROPYRIGHT.hide();
  this.CB_FRAMEBUFF.hide();
  this.CB_VSYNC.hide();
  this.CB_SOFTSHADOWS.hide();
}

Close() {
  super.Close();
  const quality = iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
  if (quality != TextureLoader.TextureQuality) {
    TextureLoader.TextureQuality = quality;
    GameState.ReloadTextureCache();
    iniConfig.save();
  }
}

updateTextureQualityLabel() {
  const quality = iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
  const _2darow = Global.kotor2DA.texpacks.rows[quality];
  if (_2darow) {
    this.BTN_TEXQUAL.setText(TLKManager.GetStringById(_2darow.strrefname));
  }
  if (quality <= 0) {
    this.BTN_TEXQUALLEFT.hide();
  } else {
    this.BTN_TEXQUALLEFT.show();
  }
  if (quality >= Global.kotor2DA.texpacks.RowCount - 1) {
    this.BTN_TEXQUALRIGHT.hide();
  } else {
    this.BTN_TEXQUALRIGHT.show();
  }
}
  
}
