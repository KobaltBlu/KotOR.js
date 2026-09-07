import { CharGenCustomStep } from "@/managers/CharGenManager";
import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIControl, GUILabel, GUIButton } from "@/gui";

/**
 * CharGenCustomPanel class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenCustomPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenCustomPanel extends GameMenu {

  LBL_BG: GUILabel;
  LBL_6: GUIControl;
  LBL_5: GUIControl;
  LBL_4: GUIControl;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  BTN_STEPNAME1: GUIButton;
  LBL_NUM1: GUILabel;
  BTN_STEPNAME2: GUIButton;
  LBL_NUM2: GUILabel;
  BTN_STEPNAME3: GUIButton;
  LBL_NUM3: GUILabel;
  BTN_STEPNAME4: GUIButton;
  LBL_NUM4: GUILabel;
  BTN_STEPNAME5: GUIButton;
  LBL_NUM5: GUILabel;
  BTN_STEPNAME6: GUIButton;
  LBL_NUM6: GUILabel;
  BTN_BACK: GUIButton;
  BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'custpnl';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
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

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 85;
      this.recalculatePosition();
      resolve();
    });
  }

  /** SetState */
  setState(step: number) {
    GameState.CharGenManager.customStep = step;
    this.applyStepVisibility();
  }

  portraitCreationCompleted() {
    GameState.CharGenManager.advanceCustomStep(CharGenCustomStep.PORTRAIT);
    this.applyStepVisibility();
  }

  abilityCreationCompleted() {
    GameState.CharGenManager.advanceCustomStep(CharGenCustomStep.ABILITIES);
    this.applyStepVisibility();
  }

  skillCreationCompleted() {
    GameState.CharGenManager.advanceCustomStep(CharGenCustomStep.SKILLS);
    this.applyStepVisibility();
  }

  featCreationCompleted() {
    GameState.CharGenManager.advanceCustomStep(CharGenCustomStep.FEATS);
    this.applyStepVisibility();
  }

  nameCreationCompleted() {
    GameState.CharGenManager.advanceCustomStep(CharGenCustomStep.NAME);
    this.applyStepVisibility();
  }

  private stepControls(index: number): { btn?: GUIButton; lbl?: GUIControl; num?: GUILabel } {
    switch(index){
      case 0: return { btn: this.BTN_STEPNAME1, lbl: this.LBL_1, num: this.LBL_NUM1 };
      case 1: return { btn: this.BTN_STEPNAME2, lbl: this.LBL_2, num: this.LBL_NUM2 };
      case 2: return { btn: this.BTN_STEPNAME3, lbl: this.LBL_3, num: this.LBL_NUM3 };
      case 3: return { btn: this.BTN_STEPNAME4, lbl: this.LBL_4, num: this.LBL_NUM4 };
      case 4: return { btn: this.BTN_STEPNAME5, lbl: this.LBL_5, num: this.LBL_NUM5 };
      case 5: return { btn: this.BTN_STEPNAME6, lbl: this.LBL_6, num: this.LBL_NUM6 };
      default: return {};
    }
  }

  applyStepVisibility() {
    const unlocked = GameState.CharGenManager.customStep;
    for(let i = 0; i < 6; i++){
      const { btn, lbl, num } = this.stepControls(i);
      if(i <= unlocked){
        btn?.show();
        lbl?.show();
        num?.show();
        if(btn) btn.disableSelection = false;
      }else{
        btn?.hide();
        lbl?.hide();
        num?.hide();
        if(btn) btn.disableSelection = true;
      }
    }
  }

  show() {
    super.show();
    this.applyStepVisibility();
  }
  
}
