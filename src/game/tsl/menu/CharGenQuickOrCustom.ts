import type { GUIListBox, GUIButton, GameMenu } from "@/gui";
import { CharGenQuickOrCustom as K1_CharGenQuickOrCustom } from "@/game/kotor/KOTOR";

/**
 * CharGenQuickOrCustom class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenQuickOrCustom.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenQuickOrCustom extends K1_CharGenQuickOrCustom {

  declare BTN_BACK: GUIButton;
  declare LB_DESC: GUIListBox;
  declare QUICK_CHAR_BTN: GUIButton;
  declare CUST_CHAR_BTN: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'qorcpnl_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.wireControls();

      // this.tGuiPanel.offset.x = -180;
      // this.tGuiPanel.offset.y = 100;
      this.recalculatePosition();
      resolve();
    });
  }

  /**
   * The TSL step panels are positioned by their own layouts.
   */
  protected positionChildPanel(panel: GameMenu){
    //no-op
  }

}
