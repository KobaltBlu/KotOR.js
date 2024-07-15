import { EngineState } from "../../../enums/engine/EngineState";
import { Anchor } from "../../../enums/gui/Anchor";
import { GameState } from "../../../GameState";
import { LBL_MapView } from "../../../gui";
import type { GUILabel, GUIButton, GUICheckBox, GUIProgressBar } from "../../../gui";
import { InGameOverlay as K1_InGameOverlay } from "../../kotor/KOTOR";
import { ActionMenuManager } from "../../../ActionMenuManager";
import { TalentObject } from "../../../talents";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { AutoPauseState } from "../../../enums/engine/AutoPauseState";

/**
 * InGameOverlay class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameOverlay.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameOverlay extends K1_InGameOverlay {

  declare LBL_MAPBORDER: GUILabel;
  declare LBL_MOULDING3: GUILabel;
  declare LBL_BACK3: GUILabel;
  declare LBL_BACK1: GUILabel;
  declare LBL_CHAR1: GUILabel;
  declare LBL_ARROW_MARGIN: GUILabel;
  declare LBL_COMBATBG3: GUILabel;
  declare LBL_MAP: GUILabel;
  declare BTN_ACTION5: GUIButton;
  declare BTN_ACTIONUP5: GUIButton;
  declare BTN_ACTIONDOWN5: GUIButton;
  declare LBL_ACTION5: GUIButton;
  declare LBL_CMBTMSGBG: GUILabel;
  declare LBL_MOULDING1: GUILabel;
  declare LBL_ACTIONDESCBG: GUILabel;
  declare LBL_ACTIONDESC: GUILabel;
  declare TB_STEALTH: GUICheckBox;
  declare TB_SOLO: GUICheckBox;
  declare LBL_MAPVIEW: GUILabel;
  declare BTN_MINIMAP: GUIButton;
  declare LBL_MENUBG: GUILabel;
  declare TB_PAUSE: GUICheckBox;
  declare BTN_SWAPWEAPONS: GUICheckBox;
  declare LBL_NAMEBG: GUILabel;
  declare LBL_HEALTHBG: GUILabel;
  declare BTN_MSG: GUIButton;
  declare BTN_JOU: GUIButton;
  declare BTN_MAP: GUIButton;
  declare BTN_OPT: GUIButton;
  declare BTN_CHAR: GUIButton;
  declare BTN_ABI: GUIButton;
  declare BTN_INV: GUIButton;
  declare BTN_EQU: GUIButton;
  declare LBL_BACK2: GUILabel;
  declare LBL_CHAR3: GUILabel;
  declare LBL_DISABLE3: GUILabel;
  declare LBL_DEBILATATED3: GUILabel;
  declare LBL_LEVELUP3: GUILabel;
  declare LBL_STEALTHXP: GUILabel;
  declare BTN_ACTION0: GUIButton;
  declare BTN_ACTIONUP0: GUIButton;
  declare BTN_ACTIONDOWN0: GUIButton;
  declare LBL_ACTION0: GUIButton;
  declare BTN_ACTION3: GUIButton;
  declare BTN_ACTIONUP3: GUIButton;
  declare BTN_ACTIONDOWN3: GUIButton;
  declare LBL_ACTION3: GUIButton;
  declare BTN_ACTION2: GUIButton;
  declare BTN_ACTIONUP2: GUIButton;
  declare BTN_ACTIONDOWN2: GUIButton;
  declare LBL_ACTION2: GUIButton;
  declare BTN_ACTION1: GUIButton;
  declare BTN_ACTIONUP1: GUIButton;
  declare BTN_ACTIONDOWN1: GUIButton;
  declare LBL_ACTION1: GUIButton;
  declare LBL_DARKSHIFT: GUILabel;
  declare PB_FORCE2: GUIProgressBar;
  declare PB_VIT2: GUIProgressBar;
  declare PB_VIT1: GUIProgressBar;
  declare LBL_DISABLE1: GUILabel;
  declare LBL_DEBILATATED1: GUILabel;
  declare LBL_LEVELUP1: GUILabel;
  declare LBL_CHAR2: GUILabel;
  declare LBL_DEBILATATED2: GUILabel;
  declare LBL_DISABLE2: GUILabel;
  declare PB_FORCE1: GUIProgressBar;
  declare PB_FORCE3: GUIProgressBar;
  declare PB_VIT3: GUIProgressBar;
  declare LBL_NAME: GUILabel;
  declare PB_HEALTH: GUIProgressBar;
  declare LBL_LEVELUP2: GUILabel;
  declare LBL_CMBTEFCTRED1: GUILabel;
  declare LBL_CMBTEFCTINC1: GUILabel;
  declare LBL_CMBTEFCTRED2: GUILabel;
  declare LBL_CMBTEFCTINC2: GUILabel;
  declare LBL_CMBTEFCTINC3: GUILabel;
  declare LBL_CMBTEFCTRED3: GUILabel;
  declare LBL_ARROW: GUILabel;
  declare LBL_JOURNAL: GUILabel;
  declare LBL_CASH: GUILabel;
  declare LBL_PLOTXP: GUILabel;
  declare LBL_ITEMRCVD: GUILabel;
  declare LBL_ITEMLOST: GUILabel;
  declare BTN_CLEARALL: GUIButton;
  declare LBL_LIGHTSHIFT: GUILabel;
  declare BTN_CHAR3: GUIButton;
  declare BTN_CHAR1: GUIButton;
  declare BTN_CHAR2: GUIButton;
  declare LBL_QUEUE0: GUILabel;
  declare LBL_QUEUE1: GUILabel;
  declare LBL_QUEUE2: GUILabel;
  declare LBL_QUEUE3: GUILabel;
  declare BTN_CLEARONE: GUIButton;
  declare BTN_CLEARONE2: GUIButton;
  declare BTN_TARGET0: GUIButton;
  declare BTN_TARGETUP0: GUIButton;
  declare BTN_TARGETDOWN0: GUIButton;
  declare LBL_TARGET0: GUIButton;
  declare BTN_TARGET1: GUIButton;
  declare BTN_TARGETUP1: GUIButton;
  declare BTN_TARGETDOWN1: GUIButton;
  declare LBL_TARGET1: GUIButton;
  declare BTN_TARGET2: GUIButton;
  declare BTN_TARGETUP2: GUIButton;
  declare BTN_TARGETDOWN2: GUIButton;
  declare LBL_TARGET2: GUIButton;
  declare LBL_CMBTMODEMSG: GUILabel;
  declare BTN_ACTION4: GUIButton;
  declare BTN_ACTIONUP4: GUIButton;
  declare BTN_ACTIONDOWN4: GUIButton;
  declare LBL_ACTION4: GUIButton;
  declare miniMap: LBL_MapView;

  constructor(){
    super();
    this.gui_resref = 'mipc28x6_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      //Auto scale anchor hack/fix
      this.BTN_ACTION5.anchor = Anchor.BottomLeft;
      this.BTN_ACTION5.recalculate();
      this.LBL_QUEUE0.anchor = Anchor.BottomCenter;
      this.LBL_QUEUE0.recalculate();

      this.tGuiPanel.widget.userData.fill.visible = false;

      /*this.TB_STEALTH.hideBorder();
      this.TB_PAUSE.hideBorder();
      this.TB_SOLO.hideBorder();*/

      this.LBL_LIGHTSHIFT.hide();
      this.LBL_DARKSHIFT.hide();
      this.LBL_JOURNAL.hide();
      this.LBL_CASH.hide();
      this.LBL_PLOTXP.hide();
      this.LBL_STEALTHXP.hide();
      this.LBL_ITEMRCVD.hide();
      this.LBL_ITEMLOST.hide();

      //Map INIT
      //this.LBL_MAPBORDER.hideBorder();
      this.LBL_MAP.hide();
      this.LBL_ARROW_MARGIN.hide();
      this.LBL_ARROW?.hide();
      this.miniMap = new LBL_MapView(this.LBL_MAPVIEW);
      this.miniMap.setControl(this.LBL_MAPVIEW);
      this.miniMap.setSize(120, 120);

      this.LBL_CMBTEFCTRED1.hide();
      this.LBL_CMBTEFCTINC1.hide();
      this.LBL_LEVELUP1.hide();
      //this.LBL_LVLUPBG1.hide();
      this.LBL_DEBILATATED1.hide();
      this.LBL_DISABLE1.hide();

      this.LBL_CMBTEFCTRED2.hide();
      this.LBL_CMBTEFCTINC2.hide();
      this.LBL_LEVELUP2.hide();
      //this.LBL_LVLUPBG2.hide();
      this.LBL_DEBILATATED2.hide();
      this.LBL_DISABLE2.hide();

      this.LBL_CMBTEFCTRED3.hide();
      this.LBL_CMBTEFCTINC3.hide();
      this.LBL_LEVELUP3.hide();
      //this.LBL_LVLUPBG3.hide();
      this.LBL_DEBILATATED3.hide();
      this.LBL_DISABLE3.hide();


      this.LBL_ACTIONDESC.hide();
      this.LBL_ACTIONDESCBG.hide();

      this.LBL_NAME.hide();
      this.LBL_NAMEBG.hide();
      this.PB_HEALTH.hide();
      this.LBL_HEALTHBG.hide();

      this.LBL_CMBTMSGBG.hide();
      this.LBL_CMBTMODEMSG.hide();
      this.BTN_CLEARALL.hideBorder();

      this.LBL_MOULDING3.widget.position.z = -1;
      this.LBL_MENUBG.widget.position.z = -1;


      this.BTN_MSG.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuPartySelection.open();
      });

      this.BTN_JOU.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuJournal.open();
      });

      this.BTN_MAP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuMap.open();
      });

      this.BTN_OPT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuOptions.open();
      });

      this.BTN_CHAR.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuCharacter.open();
      });

      this.BTN_ABI.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuAbilities.open();
      });

      this.BTN_INV.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuInventory.open();
      });

      this.BTN_EQU.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuEquipment.open();
      });

      this.TB_PAUSE.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if(GameState.State == EngineState.PAUSED){
          GameState.AutoPauseManager.Unpause();
        }else{
          GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.Generic);
        }

      });

      this.TB_SOLO.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      this.TB_STEALTH.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      this.BTN_CHAR1.addEventListener('click', (e) => {
        this.manager.MenuEquipment.open()
      });

      this.BTN_CHAR2.addEventListener('click', (e) => {
        GameState.PartyManager.SwitchLeaderAtIndex(2);
      });

      this.BTN_CHAR3.addEventListener('click', (e) => {
        GameState.PartyManager.SwitchLeaderAtIndex(1);
      });

      this.BTN_CLEARALL.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearAllActions();
        GameState.getCurrentPlayer().combatData.combatState = false;
        GameState.getCurrentPlayer().cancelCombat();
      });

      this.LBL_QUEUE0.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearCombatAction();
      });

      this.LBL_QUEUE1.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearCombatActionAtIndex(0);
      });

      this.LBL_QUEUE2.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearCombatActionAtIndex(1);
      });

      this.LBL_QUEUE3.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearCombatActionAtIndex(2);
      });

      for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){

        this.getControlByName('LBL_TARGET'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          ActionMenuManager.onTargetMenuAction(i);
        });

        this.getControlByName('BTN_TARGETUP'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          ActionMenuManager.ActionPanels.targetPanels[i].previousAction();
          this.UpdateTargetUIIcon(i);
        });

        this.getControlByName('BTN_TARGETDOWN'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          ActionMenuManager.ActionPanels.targetPanels[i].nextAction();
          this.UpdateTargetUIIcon(i);
        });

      }

      for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){

        this.getControlByName('LBL_ACTION'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          ActionMenuManager.onSelfMenuAction(i);
        });

        this.getControlByName('BTN_ACTIONUP'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          ActionMenuManager.ActionPanels.selfPanels[i].previousAction();
          this.UpdateSelfUIIcon(i);
        });

        this.getControlByName('BTN_ACTIONDOWN'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          ActionMenuManager.ActionPanels.selfPanels[i].nextAction();
          this.UpdateSelfUIIcon(i);
        });

      }

      //BTN_ACTION buttons alignment fix
      this.BTN_ACTIONUP5.anchor = Anchor.BottomLeft;
      this.BTN_ACTIONDOWN5.anchor = Anchor.BottomLeft;
      this.recalculatePosition();

      //this.lbl_combatbg2.visible = false;

      resolve();
    });
  }


  show() {
    super.show();
    GameState.Mode = EngineMode.INGAME;
    // this.BTN_ACTIONDOWN0.flipY();
    // this.BTN_ACTIONDOWN1.flipY();
    // this.BTN_ACTIONDOWN2.flipY();
    // this.BTN_ACTIONDOWN3.flipY();
    this.BTN_ACTIONDOWN4.flipY();
    this.BTN_ACTIONDOWN5.flipY();
  }

  resize() {
    this.recalculatePosition();
  }
  
}
