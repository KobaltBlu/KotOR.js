import { CharGenCustomStep } from "@/managers/CharGenManager";
import { GameState } from "@/GameState";
import type { GUIControl, GUILabel, GUIButton } from "@/gui";
import { CharGenCustomPanel as K1_CharGenCustomPanel } from "@/game/kotor/KOTOR";

/**
 * CharGenCustomPanel class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenCustomPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenCustomPanel extends K1_CharGenCustomPanel {

  declare LBL_6: GUIControl;
  declare LBL_5: GUIControl;
  declare LBL_4: GUIControl;
  declare LBL_3: GUIControl;
  declare LBL_2: GUIControl;
  declare LBL_1: GUIControl;
  declare BTN_STEPNAME1: GUIButton;
  declare LBL_NUM1: GUILabel;
  declare BTN_STEPNAME2: GUIButton;
  declare LBL_NUM2: GUILabel;
  declare BTN_STEPNAME3: GUIButton;
  declare LBL_NUM3: GUILabel;
  declare BTN_STEPNAME4: GUIButton;
  declare LBL_NUM4: GUILabel;
  declare BTN_STEPNAME5: GUIButton;
  declare LBL_NUM5: GUILabel;
  declare BTN_STEPNAME6: GUIButton;
  declare LBL_NUM6: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'custpnl_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.CharGenMain.close();
        this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
        this.manager.CharGenMain.open();
      });

      this.BTN_STEPNAME1.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.CharGenPortCust.open();
      });

      this.BTN_STEPNAME2.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.CharGenManager.customStep < CharGenCustomStep.ABILITIES) return;
        this.manager.CharGenAbilities.setCreature(GameState.CharGenManager.selectedCreature);
        this.manager.CharGenAbilities.open();
      });

      this.BTN_STEPNAME3.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.CharGenManager.customStep < CharGenCustomStep.SKILLS) return;
        this.manager.CharGenSkills.open();
      });

      this.BTN_STEPNAME4.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.CharGenManager.customStep < CharGenCustomStep.FEATS) return;
        this.manager.CharGenFeats.setCreature(GameState.CharGenManager.selectedCreature);
        this.manager.CharGenFeats.open();
      });

      this.BTN_STEPNAME5.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.CharGenManager.customStep < CharGenCustomStep.NAME) return;
        this.manager.CharGenName.open();
      });

      this.BTN_STEPNAME6.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.CharGenManager.customStep < CharGenCustomStep.PLAY) return;
        GameState.CharGenManager.finalizeAndStartGame();
      });

      this.recalculatePosition();
      resolve();
    });
  }
  
}
