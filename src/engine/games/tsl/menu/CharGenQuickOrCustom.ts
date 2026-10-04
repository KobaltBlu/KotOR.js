import { GameState } from "@engine/runtime/GameState";
import type { GUIListBox, GUIButton } from "@engine/gui";
import { CharGenQuickOrCustom as K1_CharGenQuickOrCustom } from "@engine/games/kotor/menu/CharGenQuickOrCustom";

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
    return new Promise<void>((resolve) => {
      this.QUICK_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        try{
          GameState.CharGenManager.resetChargenProgress();
          GameState.CharGenManager.doQuickStats();

          this.manager.CharGenMain.close();
          this.manager.CharGenMain.childMenu = this.manager.CharGenQuickPanel;
          this.manager.CharGenQuickPanel.setState(0);
          this.manager.CharGenMain.open();
        }catch(e){
          console.error(e);
        }
      });

      this.CUST_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.resetChargenProgress();
        this.manager.CharGenAbilities.setCreature(GameState.CharGenManager.selectedCreature);
        this.manager.CharGenAbilities.reset();
        this.manager.CharGenSkills.reset();

        this.manager.CharGenMain.close();
        this.manager.CharGenMain.childMenu = this.manager.CharGenCustomPanel;
        this.manager.CharGenCustomPanel.setState(0);
        this.manager.CharGenMain.open();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        try{
          GameState.CharGenManager.selectedCreature.model.removeFromParent();
        }catch(e){}
        this.manager.CharGenMain.close();
      });

      this.recalculatePosition();
      resolve();
    });
  }
  
}
