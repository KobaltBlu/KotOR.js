import { CharGenQuickStep } from "@/managers/CharGenManager";
import { GameState } from "@/GameState";
import type { GUILabel, GUIButton, GUIControl } from "@/gui";
import { CharGenQuickPanel as K1_CharGenQuickPanel } from "@/game/kotor/KOTOR";

/**
 * CharGenQuickPanel class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenQuickPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenQuickPanel extends K1_CharGenQuickPanel {

  declare BTN_BACK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare LBL_3: GUIControl;
  declare LBL_2: GUIControl;
  declare LBL_1: GUIControl;
  declare BTN_STEPNAME1: GUIButton;
  declare LBL_NUM1: GUILabel;
  declare BTN_STEPNAME2: GUIButton;
  declare LBL_NUM2: GUILabel;
  declare BTN_STEPNAME3: GUIButton;
  declare LBL_NUM3: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'quickpnl_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_STEPNAME1.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.CharGenPortCust.open();
      });

      this.BTN_STEPNAME2.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.CharGenManager.quickStep < CharGenQuickStep.NAME) return;
        this.manager.CharGenName.open();
      });

      this.BTN_STEPNAME3.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.CharGenManager.quickStep < CharGenQuickStep.PLAY) return;
        GameState.CharGenManager.finalizeAndStartGame();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.CharGenMain.close();
        this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
        this.manager.CharGenMain.open();
      });

      this.BTN_BACK.reattach(this.tGuiPanel);
      this.recalculatePosition();
      resolve();
    });
  }
  
}
