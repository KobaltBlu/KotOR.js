/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuStatusSummary menu class.
*/

export class MenuStatusSummary extends GameMenu {

  LBL_JOURNAL: GUILabel;
  LBL_CREDITS: GUILabel;
  LBL_XP: GUILabel;
  LBL_DARKSIDE: GUILabel;
  LBL_LIGHTSIDE: GUILabel;
  LBL_RECEIVED: GUILabel;
  LBL_LOST: GUILabel;
  LBL_CREDITS_DESC: GUILabel;
  LBL_JOURNAL_DESC: GUILabel;
  LBL_XP_DESC: GUILabel;
  LBL_DARKSIDE_DESC: GUILabel;
  LBL_LIGHTSIDE_DESC: GUILabel;
  LBL_RECEIVED_DESC: GUILabel;
  LBL_LOST_DESC: GUILabel;
  LBL_STEALTH_DESC: GUILabel;
  LBL_STEALTH: GUILabel;
  BTN_OK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'statussummary';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
