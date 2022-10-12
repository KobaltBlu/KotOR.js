/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUISlider, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuSound menu class.
*/

export class MenuSound extends GameMenu {

  LBL_TITLE: GUILabel;
  SLI_MUSIC: GUISlider;
  LBL_MUSIC: GUILabel;
  LBL_VO: GUILabel;
  SLI_VO: GUISlider;
  LBL_FX: GUILabel;
  LBL_MOVIE: GUILabel;
  SLI_FX: GUISlider;
  SLI_MOVIE: GUISlider;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_BACK: GUIButton;
  BTN_ADVANCED: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optsound';
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
