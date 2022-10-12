/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton, GUICheckBox } from "../../../gui";

/* @file
* The MenuSoundAdvanced menu class.
*/

export class MenuSoundAdvanced extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_BACK: GUIButton;
  CB_FORCESOFTWARE: GUICheckBox;
  BTN_EAX: GUIButton;
  BTN_EAXLEFT: GUIButton;
  BTN_EAXRIGHT: GUIButton;
  BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optsoundadv';
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
  this.SLI_MUSIC.setValue(AudioEngine.GAIN_MUSIC);
  this.SLI_VO.setValue(AudioEngine.GAIN_VO);
  this.SLI_FX.setValue(AudioEngine.GAIN_SFX);
  this.SLI_MOVIE.setValue(AudioEngine.GAIN_MOVIE);
}
  
}
