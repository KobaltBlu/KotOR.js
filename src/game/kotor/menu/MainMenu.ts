/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MainMenu menu class.
*/

export class MainMenu extends GameMenu {

  LB_MODULES: GUIListBox;
  LBL_3DVIEW: GUILabel;
  LBL_GAMELOGO: GUILabel;
  LBL_BW: GUILabel;
  LBL_LUCAS: GUILabel;
  LBL_MENUBG: GUILabel;
  BTN_LOADGAME: GUIButton;
  BTN_NEWGAME: GUIButton;
  BTN_MOVIES: GUIButton;
  BTN_OPTIONS: GUIButton;
  LBL_NEWCONTENT: GUILabel;
  BTN_WARP: GUIButton;
  BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'mainmenu16x12';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Update(delta = 0) {
  super.Update(delta);
  try {
    this._3dView.render(delta);
    this.lbl_3dview.getFill().material.needsUpdate = true;
  } catch (e: any) {
  }
}

Show() {
  super.Show();
  GameState.audioEngine.SetBackgroundMusic(this.bgMusicBuffer);
  GameState.AlphaTest = 0.5;
  CurrentGame.InitGameInProgressFolder();
}

triggerControllerDUpPress() {
  if (!this.selectedControl) {
    this.selectedControl = this.BTN_NEWGAME;
  }
  this.BTN_NEWGAME.onHoverOut();
  this.BTN_LOADGAME.onHoverOut();
  this.BTN_MOVIES.onHoverOut();
  this.BTN_OPTIONS.onHoverOut();
  this.BTN_EXIT.onHoverOut();
  if (this.selectedControl == this.BTN_EXIT) {
    this.selectedControl = this.BTN_OPTIONS;
  } else if (this.selectedControl == this.BTN_OPTIONS) {
    this.selectedControl = this.BTN_MOVIES;
  } else if (this.selectedControl == this.BTN_MOVIES) {
    this.selectedControl = this.BTN_LOADGAME;
  } else if (this.selectedControl == this.BTN_LOADGAME) {
    this.selectedControl = this.BTN_NEWGAME;
  } else if (this.selectedControl == this.BTN_NEWGAME) {
    this.selectedControl = this.BTN_EXIT;
  }
  this.selectedControl.onHoverIn();
}

triggerControllerDDownPress() {
  if (!this.selectedControl) {
    this.selectedControl = this.BTN_NEWGAME;
  }
  this.BTN_NEWGAME.onHoverOut();
  this.BTN_LOADGAME.onHoverOut();
  this.BTN_MOVIES.onHoverOut();
  this.BTN_OPTIONS.onHoverOut();
  this.BTN_EXIT.onHoverOut();
  if (this.selectedControl == this.BTN_NEWGAME) {
    this.selectedControl = this.BTN_LOADGAME;
  } else if (this.selectedControl == this.BTN_LOADGAME) {
    this.selectedControl = this.BTN_MOVIES;
  } else if (this.selectedControl == this.BTN_MOVIES) {
    this.selectedControl = this.BTN_OPTIONS;
  } else if (this.selectedControl == this.BTN_OPTIONS) {
    this.selectedControl = this.BTN_EXIT;
  } else if (this.selectedControl == this.BTN_EXIT) {
    this.selectedControl = this.BTN_NEWGAME;
  }
  this.selectedControl.onHoverIn();
}

triggerControllerAPress() {
  if (this.selectedControl instanceof GUIControl) {
    this.selectedControl.click();
  }
}

triggerControllerBPress() {
  this.BTN_EXIT.click();
}
  
}
