/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { ActionMenuManager } from "../../../ActionMenuManager";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, LBL_MapView } from "../../../gui";
import type { GUILabel, GUIButton, GUICheckBox, GUIProgressBar } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import * as THREE from "three";
import { ModuleCreature, ModuleObject, ModuleRoom } from "../../../module";
import { Anchor } from "../../../enums/gui/Anchor";
import { SSFObjectType } from "../../../interface/resource/SSFType";
import { TalentObject } from "../../../talents";
import { EngineState } from "../../../enums/engine/EngineState";
import { AutoPauseState } from "../../../enums/engine/AutoPauseState";
import { AutoPauseManager, PartyManager, CursorManager, TwoDAManager } from "../../../managers";

/* @file
* The InGameOverlay menu class.
*/

export class InGameOverlay extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_CMBTMODEMSG: GUILabel;
  LBL_COMBATBG2: GUILabel;
  LBL_COMBATBG3: GUILabel;
  LBL_COMBATBG1: GUILabel;
  LBL_MAP: GUILabel;
  LBL_CMBTMSGBG: GUILabel;
  LBL_MOULDING1: GUILabel;
  LBL_ACTIONDESCBG: GUILabel;
  LBL_ACTIONDESC: GUILabel;
  LBL_MOULDING2: GUILabel;
  TB_STEALTH: GUICheckBox;
  LBL_ARROW_MARGIN: GUILabel;
  TB_SOLO: GUICheckBox;
  LBL_MAPBORDER: GUILabel;
  LBL_MAPVIEW: GUILabel;
  BTN_MINIMAP: GUIButton;
  LBL_MOULDING3: GUILabel;
  LBL_MENUBG: GUILabel;
  TB_PAUSE: GUICheckBox;
  LBL_NAMEBG: GUILabel;
  LBL_HEALTHBG: GUILabel;
  BTN_MSG: GUIButton;
  BTN_JOU: GUIButton;
  BTN_MAP: GUIButton;
  BTN_OPT: GUIButton;
  BTN_CHAR: GUIButton;
  BTN_ABI: GUIButton;
  BTN_INV: GUIButton;
  BTN_EQU: GUIButton;
  LBL_BACK2: GUILabel;
  LBL_BACK3: GUILabel;
  LBL_CHAR3: GUILabel;
  LBL_DISABLE3: GUILabel;
  LBL_DEBILATATED3: GUILabel;
  LBL_LVLUPBG3: GUILabel;
  LBL_LEVELUP3: GUILabel;
  LBL_STEALTHXP: GUILabel;
  BTN_ACTION0: GUIButton;
  BTN_ACTIONUP0: GUIButton;
  BTN_ACTIONDOWN0: GUIButton;
  LBL_ACTION0: GUIButton;
  BTN_ACTION3: GUIButton;
  BTN_ACTIONUP3: GUIButton;
  BTN_ACTIONDOWN3: GUIButton;
  LBL_ACTION3: GUIButton;
  BTN_ACTION2: GUIButton;
  BTN_ACTIONUP2: GUIButton;
  BTN_ACTIONDOWN2: GUIButton;
  LBL_ACTION2: GUIButton;
  BTN_ACTION1: GUIButton;
  BTN_ACTIONUP1: GUIButton;
  BTN_ACTIONDOWN1: GUIButton;
  LBL_ACTION1: GUIButton;
  LBL_DARKSHIFT: GUILabel;
  LBL_BACK1: GUILabel;
  PB_FORCE2: GUIProgressBar;
  PB_VIT2: GUIProgressBar;
  PB_VIT1: GUIProgressBar;
  LBL_CHAR1: GUILabel;
  LBL_DISABLE1: GUILabel;
  LBL_DEBILATATED1: GUILabel;
  LBL_LVLUPBG1: GUILabel;
  LBL_LEVELUP1: GUILabel;
  LBL_CHAR2: GUILabel;
  LBL_DEBILATATED2: GUILabel;
  LBL_DISABLE2: GUILabel;
  PB_FORCE1: GUIProgressBar;
  PB_FORCE3: GUIProgressBar;
  PB_VIT3: GUIProgressBar;
  LBL_NAME: GUILabel;
  LBL_LVLUPBG2: GUILabel;
  PB_HEALTH: GUIProgressBar;
  LBL_LEVELUP2: GUILabel;
  LBL_CMBTEFCTRED1: GUILabel;
  LBL_CMBTEFCTINC1: GUILabel;
  LBL_CMBTEFCTRED2: GUILabel;
  LBL_CMBTEFCTINC2: GUILabel;
  LBL_CMBTEFCTINC3: GUILabel;
  LBL_CMBTEFCTRED3: GUILabel;
  LBL_ARROW: GUILabel;
  LBL_JOURNAL: GUILabel;
  LBL_CASH: GUILabel;
  LBL_PLOTXP: GUILabel;
  LBL_ITEMRCVD: GUILabel;
  LBL_ITEMLOST: GUILabel;
  BTN_CLEARALL: GUIButton;
  LBL_LIGHTSHIFT: GUILabel;
  BTN_CHAR3: GUIButton;
  BTN_CHAR1: GUIButton;
  BTN_CHAR2: GUIButton;
  LBL_QUEUE0: GUILabel;
  LBL_QUEUE1: GUILabel;
  LBL_QUEUE2: GUILabel;
  LBL_QUEUE3: GUILabel;
  BTN_CLEARONE: GUIButton;
  BTN_CLEARONE2: GUIButton;
  BTN_TARGET0: GUIButton;
  BTN_TARGETUP0: GUIButton;
  BTN_TARGETDOWN0: GUIButton;
  LBL_TARGET0: GUIButton;
  BTN_TARGET1: GUIButton;
  BTN_TARGETUP1: GUIButton;
  BTN_TARGETDOWN1: GUIButton;
  LBL_TARGET1: GUIButton;
  BTN_TARGET2: GUIButton;
  BTN_TARGETUP2: GUIButton;
  BTN_TARGETDOWN2: GUIButton;
  LBL_TARGET2: GUIButton;
  miniMap: LBL_MapView;

  constructor(){
    super();
    this.gui_resref = 'mipc28x6';
    this.background = '';
    this.voidFill = false;
    this.enablePositionScaling = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.tGuiPanel.widget.userData.fill.visible = false;
      //this.TB_STEALTH.hideBorder();
      //this.TB_PAUSE.hideBorder();
      //this.TB_SOLO.hideBorder();

      this.LBL_LIGHTSHIFT?.hide();
      this.LBL_DARKSHIFT?.hide();
      this.LBL_JOURNAL?.hide();
      this.LBL_CASH?.hide();
      this.LBL_PLOTXP?.hide();
      this.LBL_STEALTHXP?.hide();
      this.LBL_ITEMRCVD?.hide();
      this.LBL_ITEMLOST?.hide();

      //Map INIT
      //this.LBL_MAPBORDER.hideBorder();
      this.LBL_MAP?.hide();
      this.LBL_ARROW_MARGIN?.hide();
      this.LBL_ARROW?.hide();
      this.miniMap = new LBL_MapView(this.LBL_MAPVIEW);
      this.miniMap.setControl(this.LBL_MAPVIEW);
      this.miniMap.setSize(120, 120);

      this.LBL_CMBTEFCTRED1?.hide();
      this.LBL_CMBTEFCTINC1?.hide();
      this.LBL_LEVELUP1?.hide();
      this.LBL_LVLUPBG1?.hide();
      this.LBL_DEBILATATED1?.hide();
      this.LBL_DISABLE1?.hide();

      this.LBL_CMBTEFCTRED2?.hide();
      this.LBL_CMBTEFCTINC2?.hide();
      this.LBL_LEVELUP2?.hide();
      this.LBL_LVLUPBG2?.hide();
      this.LBL_DEBILATATED2?.hide();
      this.LBL_DISABLE2?.hide();

      this.LBL_CMBTEFCTRED3?.hide();
      this.LBL_CMBTEFCTINC3?.hide();
      this.LBL_LEVELUP3?.hide();
      this.LBL_LVLUPBG3?.hide();
      this.LBL_DEBILATATED3?.hide();
      this.LBL_DISABLE3?.hide();


      this.LBL_ACTIONDESC?.hide();
      this.LBL_ACTIONDESCBG?.hide();

      this.LBL_NAME?.hide();
      this.LBL_NAMEBG?.hide();
      this.PB_HEALTH?.hide();
      this.LBL_HEALTHBG?.hide();

      this.LBL_CMBTMSGBG?.hide();
      this.LBL_CMBTMODEMSG?.hide();
      //this.BTN_CLEARALL.hideBorder();


      this.BTN_MSG.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuMessages.open();
      });

      this.BTN_JOU.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuJournal.open();
      });

      this.BTN_MAP.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuMap.open();
      });

      this.BTN_OPT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuOptions.open();
      });

      this.BTN_CHAR.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuCharacter.open();
      });

      this.BTN_ABI.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuAbilities.open();
      });

      this.BTN_INV.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuInventory.open();
      });

      this.BTN_EQU.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuEquipment.open();
      });

      this.TB_PAUSE.addEventListener('click', (e: any) => {
        e.stopPropagation();

        if(GameState.State == EngineState.PAUSED){
          AutoPauseManager.Unpause();
        }else{
          AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.Generic);
        }

      });

      this.TB_SOLO.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.SOLOMODE = !GameState.SOLOMODE;
      });

      this.TB_STEALTH.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });

      this.BTN_CHAR1.addEventListener('click', (e: any) => {
        if(PartyManager.party[0].canLevelUp()){
          this.manager.MenuCharacter.open();
        }else{
          this.manager.MenuEquipment.open();
        }
      });

      this.BTN_CHAR2.addEventListener('click', (e: any) => {
        PartyManager.party.unshift(PartyManager.party.splice(2, 1)[0]);
        switch(Math.floor(Math.random() * (4 - 1) + 1)){
          case 2:
            PartyManager.party[0].playSoundSet(SSFObjectType.SELECT_2);
          break;
          case 3:
            PartyManager.party[0].playSoundSet(SSFObjectType.SELECT_3);
          break;
          default:
            PartyManager.party[0].playSoundSet(SSFObjectType.SELECT_1);
          break;
        }
      });

      this.BTN_CHAR3.addEventListener('click', (e: any) => {
        PartyManager.party.unshift(PartyManager.party.splice(1, 1)[0]);
        switch(Math.floor(Math.random() * (4 - 1) + 1)){
          case 2:
            PartyManager.party[0].playSoundSet(SSFObjectType.SELECT_2);
          break;
          case 3:
            PartyManager.party[0].playSoundSet(SSFObjectType.SELECT_3);
          break;
          default:
            PartyManager.party[0].playSoundSet(SSFObjectType.SELECT_1);
          break;
        }
      });

      this.BTN_CLEARALL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearAllActions();
        GameState.getCurrentPlayer().combatData.combatState = false;
        GameState.getCurrentPlayer().cancelCombat();
      });

      this.LBL_QUEUE0.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearCombatAction(GameState.getCurrentPlayer().combatData.combatAction);
      });

      this.LBL_QUEUE1.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearCombatActionAtIndex(0);
      });

      this.LBL_QUEUE2.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearCombatActionAtIndex(1);
      });

      this.LBL_QUEUE3.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearCombatActionAtIndex(2);
      });

      for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){

        this.getControlByName('LBL_TARGET'+i).addEventListener('click', (e: any) => {
          e.stopPropagation();
          const action = ActionMenuManager.ActionPanels.targetPanels[i].getSelectedAction();

          if(action){
            if(i==0){
              if(!action.talent){
                GameState.getCurrentPlayer().attackCreature(action.target, undefined);
              }else if(action.talent instanceof TalentObject){
                action.talent.useTalentOnObject(action.target, GameState.getCurrentPlayer());
              }
            }else if(action.talent){
              action.talent.useTalentOnObject(action.target, GameState.getCurrentPlayer());
            }else if(action.action){
              GameState.getCurrentPlayer().actionQueue.add(
                action.action
              );
            }
          }

        });

        this.getControlByName('BTN_TARGETUP'+i).addEventListener('click', (e: any) => {
          e.stopPropagation();
          ActionMenuManager.ActionPanels.targetPanels[i].previousAction();
          this.UpdateTargetUIIcon(i);
        });

        this.getControlByName('BTN_TARGETDOWN'+i).addEventListener('click', (e: any) => {
          e.stopPropagation();
          ActionMenuManager.ActionPanels.targetPanels[i].nextAction();
          this.UpdateTargetUIIcon(i);
        });

      }

      for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){

        this.getControlByName('LBL_ACTION'+i).addEventListener('click', (e: any) => {
          e.stopPropagation();
          const action = ActionMenuManager.ActionPanels.selfPanels[i].getSelectedAction();
          if(action){
            GameState.getCurrentPlayer().useTalent(action.talent, action.target);
          }
        });

        this.getControlByName('BTN_ACTIONUP'+i).addEventListener('click', (e: any) => {
          e.stopPropagation();
          ActionMenuManager.ActionPanels.selfPanels[i].previousAction();
          this.UpdateSelfUIIcon(i);
        });

        this.getControlByName('BTN_ACTIONDOWN'+i).addEventListener('click', (e: any) => {
          e.stopPropagation();
          ActionMenuManager.ActionPanels.selfPanels[i].nextAction();
          this.UpdateSelfUIIcon(i);
        });

      }

      // this.LBL_COMBATBG2.visible = false;
      resolve();
    });
  }

  showCombatUI() {
    this.BTN_CLEARALL?.show();
    this.BTN_CLEARONE?.show();
    this.LBL_COMBATBG1?.show();
    this.LBL_COMBATBG2?.show();
    this.LBL_COMBATBG3?.show();
    this.LBL_QUEUE0?.show();
    this.LBL_QUEUE1?.show();
    this.LBL_QUEUE2?.show();
    this.LBL_QUEUE3?.show();
  }

  hideCombatUI() {
    this.BTN_CLEARALL?.hide();
    this.BTN_CLEARONE?.hide();
    this.LBL_COMBATBG1?.hide();
    this.LBL_COMBATBG2?.hide();
    this.LBL_COMBATBG3?.hide();
    this.LBL_QUEUE0?.hide();
    this.LBL_QUEUE1?.hide();
    this.LBL_QUEUE2?.hide();
    this.LBL_QUEUE3?.hide();
    this.LBL_CMBTMSGBG?.hide();
    this.LBL_CMBTMODEMSG?.hide();
  }

  TogglePartyMember(nth = 0, bVisible = false) {
    if (!bVisible) { 
      this.getControlByName('LBL_CMBTEFCTRED' + (nth + 1))?.hide();
      this.getControlByName('LBL_CMBTEFCTINC' + (nth + 1))?.hide();
      this.getControlByName('LBL_LEVELUP' + (nth + 1))?.hide();
      this.getControlByName('LBL_LVLUPBG' + (nth + 1))?.hide();
      this.getControlByName('LBL_DEBILATATED' + (nth + 1))?.hide();
      this.getControlByName('LBL_DISABLE' + (nth + 1))?.hide();
      this.getControlByName('LBL_CHAR' + (nth + 1))?.hide();
      this.getControlByName('BTN_CHAR' + (nth + 1))?.hide();
      this.getControlByName('LBL_BACK' + (nth + 1))?.hide();
      this.getControlByName('PB_FORCE' + (nth + 1))?.hide();
      this.getControlByName('PB_VIT' + (nth + 1))?.hide();
    } else {
      this.getControlByName('LBL_CHAR' + (nth + 1))?.show();
      this.getControlByName('BTN_CHAR' + (nth + 1))?.show();
      this.getControlByName('LBL_BACK' + (nth + 1))?.show();
      this.getControlByName('PB_FORCE' + (nth + 1))?.show();
      this.getControlByName('PB_VIT' + (nth + 1))?.show();
      if (!GameState.module.area.miniGame && PartyManager.party[nth]) {
        switch (nth) {
        case 0:
          if (PartyManager.party[nth].canLevelUp()) {
            this.getControlByName('LBL_LEVELUP1').pulsing = true;
            this.getControlByName('LBL_LEVELUP1')?.show();
          } else {
            this.getControlByName('LBL_LEVELUP1')?.hide();
          }
          break;
        case 1:
          if (PartyManager.party[nth].canLevelUp()) {
            this.getControlByName('LBL_LEVELUP3').pulsing = true;
            this.getControlByName('LBL_LEVELUP3')?.show();
          } else {
            this.getControlByName('LBL_LEVELUP3')?.hide();
          }
          break;
        case 2:
          if (PartyManager.party[nth].canLevelUp()) {
            this.getControlByName('LBL_LEVELUP2').pulsing = true;
            this.getControlByName('LBL_LEVELUP2')?.show();
          } else {
            this.getControlByName('LBL_LEVELUP2')?.hide();
          }
          break;
        }
      }
    }
  }

  SetMapTexture(sTexture = '') {
    try {
      TextureLoader.Load(sTexture, (texture: OdysseyTexture) => {
        this.miniMap.setTexture(texture);
      });
    } catch (e: any) {
      console.error(e);
    }
  }

  _canShowTargetUI() {
    if (CursorManager.selectedObject instanceof ModuleCreature && CursorManager.selectedObject.isDead())
      return false;
    return (
      !this.manager.MenuContainer.bVisible && 
      CursorManager.reticle2.visible && 
      CursorManager.selectedObject instanceof ModuleObject && 
      !(CursorManager.selectedObject instanceof ModuleRoom)
    );
  }

  UpdateTargetUIIcon(index = 0) {
    const guiControl = this.getControlByName('LBL_TARGET' + index);
    if (ActionMenuManager.ActionPanels.targetPanels[index].actions.length) {
      const action = ActionMenuManager.ActionPanels.targetPanels[index].getSelectedAction();
      if (action && guiControl.getFillTextureName() != action.icon) {
        guiControl.setFillTextureName(action.icon);
        TextureLoader.tpcLoader.fetch(action.icon, (texture: OdysseyTexture) => {
          guiControl.setMaterialTexture(guiControl.border.fill.material, texture);
          guiControl.setMaterialTexture(guiControl.highlight.fill.material, texture);
          guiControl.border.fill.material.transparent = true;
          guiControl.highlight.fill.material.transparent = true;
          guiControl.widget.position.z = 1;
        });
      } else if (!action) {
        guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
        guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
      }
    } else {
      guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
      guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
    }
  }

  UpdateSelfUIIcon(index = 0) {
    const guiControl = this.getControlByName('LBL_ACTION' + index);
    if (ActionMenuManager.ActionPanels.selfPanels[index].actions.length) {
      const action = ActionMenuManager.ActionPanels.selfPanels[index].getSelectedAction();
      if (action && guiControl.getFillTextureName() != action.icon) {
        guiControl.setFillTextureName(action.icon);
        TextureLoader.tpcLoader.fetch(action.icon, (texture: OdysseyTexture) => {
          guiControl.setMaterialTexture(guiControl.border.fill.material, texture);
          guiControl.setMaterialTexture(guiControl.highlight.fill.material, texture);
          guiControl.border.fill.material.transparent = true;
          guiControl.highlight.fill.material.transparent = true;
          guiControl.widget.position.z = 1;
        });
      } else if (!action) {
        guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
        guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
      }
    } else {
      guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
      guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
    }
  }

  UpdateTargetUIPanels() {
    if (this._canShowTargetUI()) {
      if (CursorManager.selectedObject instanceof ModuleCreature) {
        if (CursorManager.selectedObject.isHostile(GameState.getCurrentPlayer()) && this.PB_HEALTH.getFillTextureName() == 'friend_bar') {
          this.PB_HEALTH.setFillTextureName('enemy_bar');
          TextureLoader.Load('enemy_bar', (map: OdysseyTexture) => {
            this.PB_HEALTH.setFillTexture(map);
          });
        } else if (!CursorManager.selectedObject.isHostile(GameState.getCurrentPlayer()) && this.PB_HEALTH.getFillTextureName() == 'enemy_bar') {
          this.PB_HEALTH.setFillTextureName('friend_bar');
          TextureLoader.Load('friend_bar', (map: OdysseyTexture) => {
            this.PB_HEALTH.setFillTexture(map);
          });
        }
      } else {
        if (this.PB_HEALTH.getFillTextureName() != 'friend_bar') {
          this.PB_HEALTH.setFillTextureName('friend_bar');
          TextureLoader.Load('friend_bar', (map: OdysseyTexture) => {
            this.PB_HEALTH.setFillTexture(map);
          });
        }
      }
      if (this.manager.InGameOverlay.LBL_NAME.text.text != CursorManager.selectedObject.getName()) {
        this.LBL_NAME.setText(CursorManager.selectedObject.getName(), 25);
      }
      let health = 100 * Math.min(Math.max(CursorManager.selectedObject.getHP() / CursorManager.selectedObject.getMaxHP(), 0), 1);
      if (health > 100)
        health = 100;
      this.PB_HEALTH.setProgress(health);
      let maxBoundsX = window.innerWidth / 2 + 640 / 2 - 125;
      let maxBoundsX2 = window.innerWidth / 2 - 640 / 2 - 125;
      let targetScreenPosition = new THREE.Vector3(640 / 2, 480 / 2, 0);
      let pos = new THREE.Vector3();
      if (CursorManager.selectedObject instanceof ModuleCreature) {
        pos.copy(CursorManager.selectedObject.position);
        pos.z += 2;
      } else {
        pos = pos.setFromMatrixPosition(CursorManager.reticle2.matrixWorld);
      }
      pos.project(GameState.currentCamera);
      const widthHalf = window.innerWidth / 2;
      const heightHalf = window.innerHeight / 2;
      pos.x = pos.x * widthHalf;
      pos.y = -(pos.y * heightHalf);
      pos.z = 0;
      targetScreenPosition.add(pos);
      if (targetScreenPosition.x > maxBoundsX) {
        targetScreenPosition.x = maxBoundsX;
      }
      if (targetScreenPosition.x < -maxBoundsX2) {
        targetScreenPosition.x = -maxBoundsX2;
      }
      if (targetScreenPosition.y > 640 / 2) {
        targetScreenPosition.y = 640 / 2;
      }
      if (targetScreenPosition.y < 100) {
        targetScreenPosition.y = 100;
      }
      this.LBL_NAME.scale = this.LBL_NAMEBG.scale = this.PB_HEALTH.scale = this.LBL_HEALTHBG.scale = false;
      this.LBL_NAME?.show();
      this.LBL_NAMEBG?.show();
      this.PB_HEALTH?.show();
      this.LBL_HEALTHBG?.show();
      this.LBL_NAME.extent.left = targetScreenPosition.x - 20;
      this.LBL_NAME.anchor = Anchor.User;
      this.LBL_NAMEBG.extent.left = targetScreenPosition.x - 20;
      this.LBL_NAMEBG.anchor = Anchor.User;
      this.PB_HEALTH.extent.left = targetScreenPosition.x - 20;
      this.PB_HEALTH.anchor = Anchor.User;
      this.LBL_HEALTHBG.extent.left = targetScreenPosition.x - 20;
      this.LBL_HEALTHBG.anchor = Anchor.User;
      this.LBL_NAME.extent.top = targetScreenPosition.y - 38;
      this.LBL_NAMEBG.extent.top = targetScreenPosition.y - 38;
      this.PB_HEALTH.extent.top = targetScreenPosition.y - 12;
      this.LBL_HEALTHBG.extent.top = targetScreenPosition.y - 12;
      this.LBL_NAME.recalculate();
      this.LBL_NAMEBG.recalculate();
      this.PB_HEALTH.recalculate();
      this.LBL_HEALTHBG.recalculate();
      if (!!ActionMenuManager.targetActionCount()) {
        for (let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++) {
          let xPos = (this.getControlByName('BTN_TARGET' + i).extent.width + 5) * i + 20;
          this.getControlByName('BTN_TARGET' + i).scale = false;
          this.getControlByName('BTN_TARGET' + i).extent.left = targetScreenPosition.x + xPos;
          this.getControlByName('BTN_TARGET' + i).extent.top = targetScreenPosition.y;
          this.getControlByName('BTN_TARGET' + i).anchor = Anchor.User;
          this.getControlByName('LBL_TARGET' + i).scale = false;
          this.getControlByName('LBL_TARGET' + i).extent.left = targetScreenPosition.x + xPos + 3;
          this.getControlByName('LBL_TARGET' + i).extent.top = targetScreenPosition.y + 14;
          this.getControlByName('LBL_TARGET' + i).anchor = Anchor.User;
          this.getControlByName('BTN_TARGETUP' + i).scale = false;
          this.getControlByName('BTN_TARGETUP' + i).extent.left = targetScreenPosition.x + xPos;
          this.getControlByName('BTN_TARGETUP' + i).extent.top = targetScreenPosition.y + 5;
          this.getControlByName('BTN_TARGETUP' + i).anchor = Anchor.User;
          this.getControlByName('BTN_TARGETDOWN' + i).scale = false;
          this.getControlByName('BTN_TARGETDOWN' + i).extent.left = targetScreenPosition.x + xPos;
          this.getControlByName('BTN_TARGETDOWN' + i).extent.top = targetScreenPosition.y + (this.getControlByName('BTN_TARGET' + i).extent.height / 2 + 12);
          this.getControlByName('BTN_TARGETDOWN' + i).widget.rotation.z = Math.PI;
          this.getControlByName('BTN_TARGETDOWN' + i).anchor = Anchor.User;
          this.UpdateTargetUIIcon(i);
          this.getControlByName('BTN_TARGET' + i).recalculate();
          this.getControlByName('LBL_TARGET' + i).recalculate();
          this.getControlByName('BTN_TARGETUP' + i).recalculate();
          this.getControlByName('BTN_TARGETDOWN' + i).recalculate();
          this.getControlByName('BTN_TARGET' + i)?.show();
          this.getControlByName('LBL_TARGET' + i)?.show();
          this.getControlByName('BTN_TARGETUP' + i)?.show();
          this.getControlByName('BTN_TARGETDOWN' + i)?.show();
        }
      } else {
        for (let i = 0; i < 3; i++) {
          this.getControlByName('BTN_TARGET' + i)?.hide();
          this.getControlByName('LBL_TARGET' + i)?.hide();
          this.getControlByName('BTN_TARGETUP' + i)?.hide();
          this.getControlByName('BTN_TARGETDOWN' + i)?.hide();
        }
      }
    } else {
      ActionMenuManager.SetTarget(undefined);
      this.LBL_NAME?.hide();
      this.LBL_NAMEBG?.hide();
      this.PB_HEALTH?.hide();
      this.LBL_HEALTHBG?.hide();
      for (let i = 0; i < 3; i++) {
        this.getControlByName('BTN_TARGET' + i)?.hide();
        this.getControlByName('LBL_TARGET' + i)?.hide();
        this.getControlByName('BTN_TARGETUP' + i)?.hide();
        this.getControlByName('BTN_TARGETDOWN' + i)?.hide();
      }
    }
  }

  UpdateSelfUIPanels(delta = 0) {
    for (let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++) {
      this.UpdateSelfUIIcon(i);
    }
  }

  update(delta = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;

    if (!GameState.module.area.miniGame) {
      const oPC = GameState.getCurrentPlayer();
      ActionMenuManager.SetPC(oPC);
      ActionMenuManager.SetTarget(CursorManager.selectedObject);
      ActionMenuManager.UpdateMenuActions();
      this.UpdateTargetUIPanels();
      this.UpdateSelfUIPanels();

      //update minimap
      this.miniMap.setPosition(oPC.position.x, oPC.position.y);
      this.miniMap.setRotation(GameState.controls.camera.rotation.z);
      this.miniMap.render(delta);

      this.TogglePartyMember(0, false);
      this.TogglePartyMember(1, false);
      this.TogglePartyMember(2, false);
      
      for (let i = 0; i < PartyManager.party.length; i++) {
        let partyMember = PartyManager.party[i];
        let portraitId = partyMember.getPortraitId();
        let portrait = TwoDAManager.datatables.get('portraits').rows[portraitId];
        let id = i;
        switch (i) {
        case 1:
          id = 2;
          break;
        case 2:
          id = 1;
          break;
        }
        this.TogglePartyMember(id, true);
        let pmBG = this.getControlByName('LBL_CHAR' + (id + 1));
        if (pmBG.getFillTextureName() != portrait.baseresref) {
          pmBG.setFillTextureName(portrait.baseresref);
          TextureLoader.tpcLoader.fetch(portrait.baseresref, (texture: OdysseyTexture) => {
            pmBG.setFillTexture(texture);
          });
        }
        (this.getControlByName('PB_VIT' + (id + 1)) as GUIProgressBar).setProgress(Math.min(Math.max(partyMember.getHP() / partyMember.getMaxHP(), 0), 1) * 100);
        (this.getControlByName('PB_FORCE' + (id + 1)) as GUIProgressBar).setProgress(Math.min(Math.max(partyMember.getFP() / partyMember.getMaxFP(), 0), 1) * 100);
        if (partyMember.isDebilitated()) {
          this.getControlByName('LBL_DEBILATATED' + (id + 1))?.show();
        } else {
          this.getControlByName('LBL_DEBILATATED' + (id + 1))?.hide();
        }
      }
      if (oPC.combatData.combatAction || oPC.combatData.combatQueue.length) {
        this.showCombatUI();
        let action0 = oPC.combatData.combatAction;
        let action1 = oPC.combatData.combatQueue[0];
        let action2 = oPC.combatData.combatQueue[1];
        let action3 = oPC.combatData.combatQueue[2];
        if (action0 != undefined) {
          if (this.LBL_QUEUE0.getFillTextureName() != action0.icon) {
            this.LBL_QUEUE0.setFillTextureName(action0.icon);
            TextureLoader.tpcLoader.fetch(action0.icon, (texture: OdysseyTexture) => {
              this.LBL_QUEUE0.setFillTexture(texture);
              this.LBL_QUEUE0.border.fill.material.transparent = true;
            });
          }
        } else {
          this.LBL_QUEUE0.setFillTextureName('');
          this.LBL_QUEUE0.setFillTexture(undefined);
        }
        if (action1 != undefined) {
          if (this.LBL_QUEUE1.getFillTextureName() != action1.icon) {
            this.LBL_QUEUE1.setFillTextureName(action1.icon);
            TextureLoader.tpcLoader.fetch(action1.icon, (texture: OdysseyTexture) => {
              this.LBL_QUEUE1.setFillTexture(texture);
              this.LBL_QUEUE1.border.fill.material.transparent = true;
            });
          }
        } else {
          this.LBL_QUEUE1.setFillTextureName('');
          this.LBL_QUEUE1.setFillTexture(undefined);
        }
        if (action2 != undefined) {
          if (this.LBL_QUEUE2.getFillTextureName() != action2.icon) {
            this.LBL_QUEUE2.setFillTextureName(action2.icon);
            TextureLoader.tpcLoader.fetch(action2.icon, (texture: OdysseyTexture) => {
              this.LBL_QUEUE2.setFillTexture(texture);
              this.LBL_QUEUE2.border.fill.material.transparent = true;
            });
          }
        } else {
          this.LBL_QUEUE2.setFillTextureName('');
          this.LBL_QUEUE2.setFillTexture(undefined);
        }
        if (action3 != undefined) {
          if (this.LBL_QUEUE3.getFillTextureName() != action3.icon) {
            this.LBL_QUEUE3.setFillTextureName(action3.icon);
            TextureLoader.tpcLoader.fetch(action3.icon, (texture: OdysseyTexture) => {
              this.LBL_QUEUE3.setFillTexture(texture);
              this.LBL_QUEUE3.border.fill.material.transparent = true;
            });
          }
        } else {
          this.LBL_QUEUE3.setFillTextureName('');
          this.LBL_QUEUE3.setFillTexture(undefined);
        }
      } else {
        this.hideCombatUI();
      }
    }
  }

  show() {
    super.show();
    this.BTN_ACTIONDOWN0.flipY();
    this.BTN_ACTIONDOWN1.flipY();
    this.BTN_ACTIONDOWN2.flipY();
    this.BTN_ACTIONDOWN3.flipY();
  }

  resize() {
    this.recalculatePosition();
  }

  triggerControllerAPress() {
    if (CursorManager.selectedObject) {
      if (typeof CursorManager.selectedObject.onClick === 'function') {
        GameState.getCurrentPlayer().clearAllActions();
        CursorManager.selectedObject.onClick(GameState.getCurrentPlayer());
      } else {
        let distance = GameState.getCurrentPlayer().position.distanceTo(CursorManager.selectedObject.position);
        if (distance > 1.5) {
          GameState.getCurrentPlayer().clearAllActions();
          CursorManager.selectedObject.clearAllActions();
          GameState.getCurrentPlayer().actionDialogObject(CursorManager.selectedObject);
        }
      }
    }
  }
  
}
