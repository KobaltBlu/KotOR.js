/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import type { GUILabel, GUIButton, GUIListBox } from "../../../gui";
import { MainMovies as K1_MainMovies } from "../../kotor/KOTOR";

/* @file
* The MainMovies menu class.
*/

export class MainMovies extends K1_MainMovies {

  declare LBL_TITLE: GUILabel;
  declare LBL_UNLOCKED: GUILabel;
  declare LBL_UNLOCKED_VALUE: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare LB_MOVIES: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'titlemovie_p';
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
