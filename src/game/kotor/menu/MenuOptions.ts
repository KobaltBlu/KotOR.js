/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIButton, GUILabel, GUIListBox } from "../../../gui";

/* @file
* The MenuOptions menu class.
*/

export class MenuOptions extends GameMenu {

  BTN_LOADGAME: GUIButton;
  BTN_SAVEGAME: GUIButton;
  BTN_GAMEPLAY: GUIButton;
  BTN_QUIT: GUIButton;
  LBL_TITLE: GUILabel;
  BTN_FEEDBACK: GUIButton;
  BTN_AUTOPAUSE: GUIButton;
  BTN_GRAPHICS: GUIButton;
  BTN_SOUND: GUIButton;
  LB_DESC: GUIListBox;
  BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optionsingame';
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
  GameState.MenuTop.LBLH_OPT.onHoverIn();
  GameState.MenuActive = true;
}

triggerControllerDUpPress() {
  if (!this.selectedControl) {
    this.selectedControl = this.BTN_NEWGAME;
  }
  this.BTN_LOADGAME.onHoverOut();
  this.BTN_SAVEGAME.onHoverOut();
  this.BTN_FEEDBACK.onHoverOut();
  this.BTN_GRAPHICS.onHoverOut();
  this.BTN_GAMEPLAY.onHoverOut();
  this.BTN_SOUND.onHoverOut();
  this.BTN_AUTOPAUSE.onHoverOut();
  if (this.selectedControl == this.BTN_SOUND) {
    this.selectedControl = this.BTN_GRAPHICS;
  } else if (this.selectedControl == this.BTN_GRAPHICS) {
    this.selectedControl = this.BTN_AUTOPAUSE;
  } else if (this.selectedControl == this.BTN_AUTOPAUSE) {
    this.selectedControl = this.BTN_FEEDBACK;
  } else if (this.selectedControl == this.BTN_FEEDBACK) {
    this.selectedControl = this.BTN_GAMEPLAY;
  } else if (this.selectedControl == this.BTN_GAMEPLAY) {
    this.selectedControl = this.BTN_SAVEGAME;
  } else if (this.selectedControl == this.BTN_SAVEGAME) {
    this.selectedControl = this.BTN_LOADGAME;
  } else if (this.selectedControl == this.BTN_LOADGAME) {
    this.selectedControl = this.BTN_SOUND;
  }
  this.selectedControl.onHoverIn();
}

triggerControllerDDownPress() {
  if (!this.selectedControl) {
    this.selectedControl = this.BTN_NEWGAME;
  }
  this.BTN_LOADGAME.onHoverOut();
  this.BTN_SAVEGAME.onHoverOut();
  this.BTN_FEEDBACK.onHoverOut();
  this.BTN_GRAPHICS.onHoverOut();
  this.BTN_GAMEPLAY.onHoverOut();
  this.BTN_SOUND.onHoverOut();
  this.BTN_AUTOPAUSE.onHoverOut();
  if (this.selectedControl == this.BTN_LOADGAME) {
    this.selectedControl = this.BTN_SAVEGAME;
  } else if (this.selectedControl == this.BTN_SAVEGAME) {
    this.selectedControl = this.BTN_GAMEPLAY;
  } else if (this.selectedControl == this.BTN_GAMEPLAY) {
    this.selectedControl = this.BTN_FEEDBACK;
  } else if (this.selectedControl == this.BTN_FEEDBACK) {
    this.selectedControl = this.BTN_AUTOPAUSE;
  } else if (this.selectedControl == this.BTN_AUTOPAUSE) {
    this.selectedControl = this.BTN_GRAPHICS;
  } else if (this.selectedControl == this.BTN_GRAPHICS) {
    this.selectedControl = this.BTN_SOUND;
  } else if (this.selectedControl == this.BTN_SOUND) {
    this.selectedControl = this.BTN_LOADGAME;
  }
  this.selectedControl.onHoverIn();
}

triggerControllerAPress() {
  if (this.selectedControl instanceof GUIControl) {
    this.selectedControl.click();
  }
}

triggerControllerRStickYPress(positive = false) {
  if (positive) {
    this.LB_DESC.scrollUp();
  } else {
    this.LB_DESC.scrollDown();
  }
}

triggerControllerBumperLPress() {
  GameState.MenuTop.BTN_MAP.click();
}

triggerControllerBumperRPress() {
  GameState.MenuTop.BTN_EQU.click();
}
  
}
