import { CharGenQuickStep } from "@/managers/CharGenManager";
import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIControl, GUILabel, GUIButton } from "@/gui";

/**
 * CharGenQuickPanel class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenQuickPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenQuickPanel extends GameMenu {

  LBL_DECORATION: GUILabel;
  BTN_BACK: GUIButton;
  BTN_CANCEL: GUIButton;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  BTN_STEPNAME1: GUIButton;
  LBL_NUM1: GUILabel;
  BTN_STEPNAME2: GUIButton;
  LBL_NUM2: GUILabel;
  BTN_STEPNAME3: GUIButton;
  LBL_NUM3: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'quickpnl';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
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

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 85;
      this.recalculatePosition();
      resolve();
    });
  }

  /** SetState */
  setState(step: number) {
    GameState.CharGenManager.quickStep = step;
    this.applyStepVisibility();
  }

  portraitCreationCompleted() {
    GameState.CharGenManager.advanceQuickStep(CharGenQuickStep.PORTRAIT);
    this.applyStepVisibility();
  }

  nameCreationCompleted() {
    GameState.CharGenManager.advanceQuickStep(CharGenQuickStep.NAME);
    this.applyStepVisibility();
  }

  applyStepVisibility() {
    const step = GameState.CharGenManager.quickStep;

    this.BTN_STEPNAME1?.show();
    this.LBL_1?.show();
    this.LBL_NUM1?.show();

    if(step >= CharGenQuickStep.NAME){
      this.BTN_STEPNAME2?.show();
      this.LBL_2?.show();
      this.LBL_NUM2?.show();
      if(this.BTN_STEPNAME2) this.BTN_STEPNAME2.disableSelection = false;
    }else{
      this.BTN_STEPNAME2?.hide();
      this.LBL_2?.hide();
      this.LBL_NUM2?.hide();
    }

    if(step >= CharGenQuickStep.PLAY){
      this.BTN_STEPNAME3?.show();
      this.LBL_3?.show();
      this.LBL_NUM3?.show();
      if(this.BTN_STEPNAME3) this.BTN_STEPNAME3.disableSelection = false;
    }else{
      this.BTN_STEPNAME3?.hide();
      this.LBL_3?.hide();
      this.LBL_NUM3?.hide();
      if(this.BTN_STEPNAME3) this.BTN_STEPNAME3.disableSelection = true;
    }
  }

  show() {
    super.show();
    this.applyStepVisibility();
  }
  
}
