/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUISlider, GUIListBox, GUIButton } from "../../../gui";
import { MenuSound as K1_MenuSound } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The MenuSound menu class.
*/

export class MenuSound extends K1_MenuSound {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare SLI_MUSIC: GUISlider;
  declare LBL_MUSIC: GUILabel;
  declare LBL_VO: GUILabel;
  declare SLI_VO: GUISlider;
  declare LBL_FX: GUILabel;
  declare LBL_MOVIE: GUILabel;
  declare SLI_FX: GUISlider;
  declare SLI_MOVIE: GUISlider;
  declare LB_DESC: GUIListBox;
  declare BTN_ADVANCED: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optsound_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
