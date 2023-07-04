/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUIListBox, GUIButton } from "../../../gui";
import { TLKManager } from "../../../managers/TLKManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { InGameConfirm as K1_InGameConfirm } from "../../kotor/KOTOR";

/* @file
* The InGameConfirm menu class.
*/

export class InGameConfirm extends K1_InGameConfirm {

  declare LB_MESSAGE: GUIListBox;
  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'confirm_p';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_OK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close()
      });

      this.BTN_CANCEL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close()
      });

      this.tGuiPanel.widget.position.z = 10;
      resolve();
    });
  }

  Update(delta: number) {
    super.Update(delta);
  }
  
}
