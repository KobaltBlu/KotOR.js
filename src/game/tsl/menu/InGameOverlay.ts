/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { InGameOverlay as K1_InGameOverlay, GUILabel, GUIButton, GUICheckBox, GUIProgressBar, MenuManager } from "../../../gui";

/* @file
* The InGameOverlay menu class.
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

  constructor(){
    super();
    this.gui_resref = 'mipc28x6_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {

      //Auto scale anchor hack/fix
      this.BTN_ACTION5.anchor = 'bl';
      this.BTN_ACTION5.recalculate();
      this.LBL_QUEUE0.anchor = 'bc';
      this.LBL_QUEUE0.recalculate();

      this.tGuiPanel.widget.fill.visible = false;

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


      this.BTN_MSG.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuPartySelection.Open();
      });

      this.BTN_JOU.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuJournal.Open();
      });

      this.BTN_MAP.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuMap.Open();
      });

      this.BTN_OPT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuOptions.Open();
      });

      this.BTN_CHAR.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuCharacter.Open();
      });

      this.BTN_ABI.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuCharacter.Open();
      });

      this.BTN_INV.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuInventory.Open();
      });

      this.BTN_EQU.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuEquipment.Open();
      });

      this.TB_PAUSE.addEventListener('click', (e: any) => {
        e.stopPropagation();

        if(GameState.State == GameState.STATES.PAUSED){
          GameState.State = GameState.STATES.RUNNING;
        }else{
          GameState.State = GameState.STATES.PAUSED
        }

      });

      this.TB_SOLO.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });

      this.TB_STEALTH.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });

      this.BTN_CHAR1.addEventListener('click', (e: any) => {
        MenuManager.MenuEquipment.Open()
      });

      this.BTN_CHAR2.addEventListener('click', (e: any) => {
        PartyManager.party.unshift(PartyManager.party.splice(2, 1)[0]);
      });

      this.BTN_CHAR3.addEventListener('click', (e: any) => {
        PartyManager.party.unshift(PartyManager.party.splice(1, 1)[0]);
      });

      this.BTN_CLEARALL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().clearAllActions();
        GameState.getCurrentPlayer().combatState = false;
        GameState.getCurrentPlayer().cancelCombat();
      });

      this.LBL_QUEUE0.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().combatAction = undefined;
      });

      this.LBL_QUEUE1.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().combatQueue.splice(0, 1);
      });

      this.LBL_QUEUE2.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().combatQueue.splice(1, 1);
      });

      this.LBL_QUEUE3.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.getCurrentPlayer().combatQueue.splice(2, 1);
      });

      for(let i = 0; i < 3; i++){
          
        //this['BTN_TARGET'+i]

        this['LBL_TARGET'+i].addEventListener('click', (e: any) => {
          e.stopPropagation();
          let action = this.targetSkills['target'+i][this['target'+i+'_idx']];

          if(action){
            if(i==0){
              GameState.getCurrentPlayer().attackCreature(action.action.object, action.action.feat);
            }else{
              GameState.getCurrentPlayer().actionQueue.add(
                action.action
              );
            }
          }

        });

        this['BTN_TARGETUP'+i].addEventListener('click', (e: any) => {
          e.stopPropagation();
          
          this['target'+i+'_idx'] -= 1;
          if(this['target'+i+'_idx'] < 0){
            this['target'+i+'_idx'] = this.targetSkills['target'+i].length - 1;
          }

          this.UpdateTargetUIIcon(i);

        });

        this['BTN_TARGETDOWN'+i].addEventListener('click', (e: any) => {
          e.stopPropagation();

          this['target'+i+'_idx'] += 1;
          if(this['target'+i+'_idx'] >= this.targetSkills['target'+i].length){
            this['target'+i+'_idx'] = 0;
          }

          this.UpdateTargetUIIcon(i);

        });

      }

      //BTN_ACTION buttons alignment fix
      this.BTN_ACTIONUP5.anchor = 'bl';
      this.BTN_ACTIONDOWN5.anchor = 'bl';
      this.RecalculatePosition();

      //this.lbl_combatbg2.visible = false;

      resolve();
    });
  }

  showCombatUI() {
  }

  hideCombatUI() {
  }

  TogglePartyMember(nth = 0, bVisible = false) {
    if (!bVisible) {
      this['LBL_CMBTEFCTRED' + (nth + 1)].hide();
      this['LBL_CMBTEFCTINC' + (nth + 1)].hide();
      this['LBL_LEVELUP' + (nth + 1)].hide();
      this['LBL_DEBILATATED' + (nth + 1)].hide();
      this['LBL_DISABLE' + (nth + 1)].hide();
      this['LBL_CHAR' + (nth + 1)].hide();
      this['BTN_CHAR' + (nth + 1)].hide();
      this['LBL_BACK' + (nth + 1)].hide();
      this['PB_FORCE' + (nth + 1)].hide();
      this['PB_VIT' + (nth + 1)].hide();
    } else {
      this['LBL_CHAR' + (nth + 1)].show();
      this['BTN_CHAR' + (nth + 1)].show();
      this['LBL_BACK' + (nth + 1)].show();
      this['PB_FORCE' + (nth + 1)].show();
      this['PB_VIT' + (nth + 1)].show();
    }
  }

  SetMapTexture(sTexture = '') {
    try {
      this.LBL_MAPVIEW.getFill().material.transparent = false;
      this.LBL_MAPVIEW.setFillTextureName(sTexture);
      TextureLoader.tpcLoader.fetch(sTexture, texture => {
        this.LBL_MAPVIEW.setFillTexture(texture);
        texture.repeat.x = 0.25;
        texture.repeat.y = 0.5;
      });
    } catch (e: any) {
    }
  }

  UpdateTargetUISkills() {
    let currentPlayer = GameState.getCurrentPlayer();
    this.target0_idx = 0;
    this.target1_idx = 0;
    this.target2_idx = 0;
    let skills = {
      target0: [],
      target1: [],
      target2: []
    };
    if (GameState.selectedObject instanceof ModuleObject) {
      if (GameState.selectedObject instanceof ModulePlaceable) {
        if (GameState.selectedObject.isLocked() && !GameState.selectedObject.requiresKey()) {
          let action1 = new ActionUnlockObject();
          action1.setParameter(0, ActionParameterType.DWORD, GameState.selectedObject.id);
          skills.target1.push({
            action: action1,
            icon: 'isk_security'
          });
          skills.target0.push({
            action: {
              type: ActionType.ActionPhysicalAttacks,
              object: GameState.selectedObject,
              feat: undefined
            },
            icon: 'i_attack'
          });
        }
      } else if (GameState.selectedObject instanceof ModuleDoor) {
        if (GameState.selectedObject.isLocked() && !GameState.selectedObject.requiresKey()) {
          skills.target1.push({
            action: {
              type: ActionType.ActionUnlockObject,
              object: GameState.selectedObject
            },
            icon: 'isk_security'
          });
          skills.target0.push({
            action: {
              type: ActionType.ActionPhysicalAttacks,
              object: GameState.selectedObject,
              feat: undefined
            },
            icon: 'i_attack'
          });
        }
      } else if (GameState.selectedObject instanceof ModuleCreature && GameState.selectedObject.isHostile(GameState.player)) {
        skills.target0.push({
          action: {
            type: ActionType.ActionPhysicalAttacks,
            object: GameState.selectedObject,
            feat: undefined
          },
          icon: 'i_attack'
        });
        if (currentPlayer.getEquippedWeaponType() == 1) {
          if (currentPlayer.getFeat(81)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(81)
              },
              icon: currentPlayer.getFeat(81).icon
            });
          } else if (currentPlayer.getFeat(19)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(19)
              },
              icon: currentPlayer.getFeat(19).icon
            });
          } else if (currentPlayer.getFeat(8)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(8)
              },
              icon: currentPlayer.getFeat(8).icon
            });
          }
          if (currentPlayer.getFeat(83)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(83)
              },
              icon: currentPlayer.getFeat(83).icon
            });
          } else if (currentPlayer.getFeat(17)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(17)
              },
              icon: currentPlayer.getFeat(17).icon
            });
          } else if (currentPlayer.getFeat(28)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(28)
              },
              icon: currentPlayer.getFeat(28).icon
            });
          }
          if (currentPlayer.getFeat(53)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(53)
              },
              icon: currentPlayer.getFeat(53).icon
            });
          } else if (currentPlayer.getFeat(91)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(91)
              },
              icon: currentPlayer.getFeat(91).icon
            });
          } else if (currentPlayer.getFeat(11)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(11)
              },
              icon: currentPlayer.getFeat(11).icon
            });
          }
        }
        if (currentPlayer.getEquippedWeaponType() == 4) {
          if (currentPlayer.getFeat(77)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(77)
              },
              icon: currentPlayer.getFeat(77).icon
            });
          } else if (currentPlayer.getFeat(20)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(20)
              },
              icon: currentPlayer.getFeat(20).icon
            });
          } else if (currentPlayer.getFeat(31)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(31)
              },
              icon: currentPlayer.getFeat(31).icon
            });
          }
          if (currentPlayer.getFeat(82)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(82)
              },
              icon: currentPlayer.getFeat(82).icon
            });
          } else if (currentPlayer.getFeat(18)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(18)
              },
              icon: currentPlayer.getFeat(18).icon
            });
          } else if (currentPlayer.getFeat(29)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(29)
              },
              icon: currentPlayer.getFeat(29).icon
            });
          }
          if (currentPlayer.getFeat(26)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(26)
              },
              icon: currentPlayer.getFeat(26).icon
            });
          } else if (currentPlayer.getFeat(92)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(92)
              },
              icon: currentPlayer.getFeat(92).icon
            });
          } else if (currentPlayer.getFeat(30)) {
            skills.target0.push({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: GameState.selectedObject,
                feat: currentPlayer.getFeat(30)
              },
              icon: currentPlayer.getFeat(30).icon
            });
          }
        }
      }
    }
    return !skills.target0.length && !skills.target1.length && !skills.target2.length ? null : skills;
  }

  _canShowTargetUI() {
    if (GameState.selectedObject instanceof ModuleCreature && GameState.selectedObject.isDead())
      return false;
    return !MenuManager.MenuContainer.bVisible && CursorManager.reticle2.visible && GameState.selectedObject instanceof ModuleObject && !(GameState.selectedObject instanceof ModuleRoom);
  }

  UpdateTargetUIIcon(index = 0) {
    let guiControl = this['LBL_TARGET' + index];
    if (this.targetSkills['target' + index].length) {
      let action = this.targetSkills['target' + index][this['target' + index + '_idx']];
      if (guiControl.getFillTextureName() != action.icon) {
        guiControl.setFillTextureName(action.icon);
        TextureLoader.tpcLoader.fetch(action.icon, texture => {
          guiControl.setMaterialTexture(guiControl.border.fill.material, texture);
          guiControl.setMaterialTexture(guiControl.highlight.fill.material, texture);
          guiControl.border.fill.material.transparent = true;
          guiControl.highlight.fill.material.transparent = true;
        });
      }
    } else {
      guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
      guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
    }
  }

  UpdateTargetUI() {
    if (this._canShowTargetUI()) {
      if (this.lastTarget != GameState.selectedObject || this.lastCurrentPlayer != GameState.getCurrentPlayer()) {
        this.lastCurrentPlayer = GameState.getCurrentPlayer();
        this.targetSkills = this.UpdateTargetUISkills();
      }
      if (GameState.selectedObject instanceof ModuleCreature) {
        if (GameState.selectedObject.isHostile(GameState.getCurrentPlayer()) && this.PB_HEALTH.getFillTextureName() == 'friend_bar') {
          this.PB_HEALTH.setFillTextureName('enemy_bar');
          TextureLoader.Load('enemy_bar', map => {
            this.PB_HEALTH.setFillTexture(map);
          });
        } else if (!GameState.selectedObject.isHostile(GameState.getCurrentPlayer()) && this.PB_HEALTH.getFillTextureName() == 'enemy_bar') {
          this.PB_HEALTH.setFillTextureName('friend_bar');
          TextureLoader.Load('friend_bar', map => {
            this.PB_HEALTH.setFillTexture(map);
          });
        }
      } else {
        if (this.PB_HEALTH.getFillTextureName() != 'friend_bar') {
          this.PB_HEALTH.setFillTextureName('friend_bar');
          TextureLoader.Load('friend_bar', map => {
            this.PB_HEALTH.setFillTexture(map);
          });
        }
      }
      if (MenuManager.InGameOverlay.LBL_NAME.text.text != GameState.selectedObject.getName()) {
        this.LBL_NAME.setText(GameState.selectedObject.getName(), 25);
      }
      let health = 100 * Math.min(Math.max(GameState.selectedObject.getHP() / GameState.selectedObject.getMaxHP(), 0), 1);
      if (health > 100)
        health = 100;
      this.PB_HEALTH.setProgress(health);
      let maxBoundsX = window.innerWidth / 2 + 640 / 2 - 125;
      let maxBoundsX2 = window.innerWidth / 2 - 640 / 2 - 125;
      let targetScreenPosition = new THREE.Vector3(640 / 2, 480 / 2, 0);
      let pos = new THREE.Vector3();
      if (GameState.selectedObject instanceof ModuleCreature) {
        pos.copy(GameState.selectedObject.position);
        pos.z += 2;
      } else {
        pos = pos.setFromMatrixPosition(CursorManager.reticle2.matrixWorld);
      }
      pos.project(GameState.currentCamera);
      let widthHalf = window.innerWidth / 2;
      let heightHalf = window.innerHeight / 2;
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
      this.LBL_NAME.show();
      this.LBL_NAMEBG.show();
      this.PB_HEALTH.show();
      this.LBL_HEALTHBG.show();
      this.LBL_NAME.extent.left = targetScreenPosition.x - 20;
      this.LBL_NAME.anchor = 'user';
      this.LBL_NAMEBG.extent.left = targetScreenPosition.x - 20;
      this.LBL_NAMEBG.anchor = 'user';
      this.PB_HEALTH.extent.left = targetScreenPosition.x - 20;
      this.PB_HEALTH.anchor = 'user';
      this.LBL_HEALTHBG.extent.left = targetScreenPosition.x - 20;
      this.LBL_HEALTHBG.anchor = 'user';
      this.LBL_NAME.extent.top = targetScreenPosition.y - 38;
      this.LBL_NAMEBG.extent.top = targetScreenPosition.y - 38;
      this.PB_HEALTH.extent.top = targetScreenPosition.y - 12;
      this.LBL_HEALTHBG.extent.top = targetScreenPosition.y - 12;
      this.LBL_NAME.recalculate();
      this.LBL_NAMEBG.recalculate();
      this.PB_HEALTH.recalculate();
      this.LBL_HEALTHBG.recalculate();
      if (this.targetSkills) {
        for (let i = 0; i < 3; i++) {
          let xPos = (this['BTN_TARGET' + i].extent.width + 5) * i + 20;
          this['BTN_TARGET' + i].scale = false;
          this['BTN_TARGET' + i].extent.left = targetScreenPosition.x + xPos;
          this['BTN_TARGET' + i].extent.top = targetScreenPosition.y;
          this['BTN_TARGET' + i].anchor = 'user';
          this['LBL_TARGET' + i].scale = false;
          this['LBL_TARGET' + i].extent.left = targetScreenPosition.x + xPos + 3;
          this['LBL_TARGET' + i].extent.top = targetScreenPosition.y + 14;
          this['LBL_TARGET' + i].anchor = 'user';
          this['BTN_TARGETUP' + i].scale = false;
          this['BTN_TARGETUP' + i].extent.left = targetScreenPosition.x + xPos;
          this['BTN_TARGETUP' + i].extent.top = targetScreenPosition.y + 5;
          this['BTN_TARGETUP' + i].anchor = 'user';
          this['BTN_TARGETDOWN' + i].scale = false;
          this['BTN_TARGETDOWN' + i].extent.left = targetScreenPosition.x + xPos;
          this['BTN_TARGETDOWN' + i].extent.top = targetScreenPosition.y + (this['BTN_TARGET' + i].extent.height / 2 + 12);
          this['BTN_TARGETDOWN' + i].widget.rotation.z = Math.PI;
          this['BTN_TARGETDOWN' + i].anchor = 'user';
          this.UpdateTargetUIIcon(i);
          this['BTN_TARGET' + i].recalculate();
          this['LBL_TARGET' + i].recalculate();
          this['BTN_TARGETUP' + i].recalculate();
          this['BTN_TARGETDOWN' + i].recalculate();
          this['BTN_TARGET' + i].show();
          this['LBL_TARGET' + i].show();
          this['BTN_TARGETUP' + i].show();
          this['BTN_TARGETDOWN' + i].show();
        }
      } else {
        for (let i = 0; i < 3; i++) {
          this['BTN_TARGET' + i].hide();
          this['LBL_TARGET' + i].hide();
          this['BTN_TARGETUP' + i].hide();
          this['BTN_TARGETDOWN' + i].hide();
        }
      }
      this.lastTarget = GameState.selectedObject;
    } else {
      this.targetSkills = undefined;
      this.lastTarget = undefined;
      this.LBL_NAME.hide();
      this.LBL_NAMEBG.hide();
      this.PB_HEALTH.hide();
      this.LBL_HEALTHBG.hide();
      for (let i = 0; i < 3; i++) {
        this['BTN_TARGET' + i].hide();
        this['LBL_TARGET' + i].hide();
        this['BTN_TARGETUP' + i].hide();
        this['BTN_TARGETDOWN' + i].hide();
      }
    }
  }

  Update(delta = 0) {
    super.Update(delta);
    this.UpdateTargetUI();
    let mapTexture = this.LBL_MAPVIEW.getFillTexture();
    if (mapTexture) {
      let map = GameState.module.area.Map;
      let position = GameState.getCurrentPlayer().position;
      switch (GameState.module.area.Map.NorthAxis) {
      case 0:
        let scaleX = (map.MapPt1X - map.MapPt2X) / (map.WorldPt1X - map.WorldPt2X);
        let scaleY = (map.MapPt1Y - map.MapPt2Y) / (map.WorldPt1Y - map.WorldPt2Y);
        let pointX = (position.x - map.WorldPt1X) * scaleX + map.MapPt1X;
        let pointY = (position.y - map.WorldPt1Y) * scaleY + map.MapPt1Y;
        mapTexture.offset.x = pointX - 0.1;
        mapTexture.offset.y = 1 - pointY - 0.25;
        this.LBL_ARROW.widget.rotation.set(0, 0, PartyManager.party[0].facing);
        break;
      case 3:
        this.LBL_ARROW.widget.rotation.set(0, 0, PartyManager.party[0].facing - Math.PI / 2);
        break;
      }
      mapTexture.updateMatrix();
    }
    this.TogglePartyMember(0, false);
    this.TogglePartyMember(1, false);
    this.TogglePartyMember(2, false);
    for (let i = 0; i < PartyManager.party.length; i++) {
      let partyMember = PartyManager.party[i];
      let portraitId = partyMember.getPortraitId();
      let portrait = Global.kotor2DA['portraits'].rows[portraitId];
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
      let pmBG = this['LBL_BACK' + (id + 1)];
      pmBG.setFillColor(1, 1, 1);
      MenuManager.InGameOverlay['PB_VIT' + (id + 1)].setFillColor(1, 0, 0);
      MenuManager.InGameOverlay['PB_FORCE' + (id + 1)].setFillColor(0, 0.5, 1);
      if (pmBG.getFillTextureName() != portrait.baseresref) {
        pmBG.setFillTextureName(portrait.baseresref);
        TextureLoader.tpcLoader.fetch(portrait.baseresref, texture => {
          pmBG.setFillTexture(texture);
        });
      }
      this['PB_VIT' + (id + 1)].setProgress(Math.min(Math.max(partyMember.getHP() / partyMember.getMaxHP(), 0), 1) * 100);
      this['PB_FORCE' + (id + 1)].setProgress(Math.min(Math.max(partyMember.getFP() / partyMember.getMaxFP(), 0), 1) * 100);
      if (partyMember.isDebilitated()) {
        this['LBL_DEBILATATED' + (id + 1)].show();
      } else {
        this['LBL_DEBILATATED' + (id + 1)].hide();
      }
    }
    if (GameState.selectedObject && GameState.selectedObject.isHostile() || (GameState.getCurrentPlayer().combatAction || GameState.getCurrentPlayer().combatQueue.length)) {
      this.showCombatUI();
      let action0 = GameState.getCurrentPlayer().combatAction;
      let action1 = GameState.getCurrentPlayer().combatQueue[0];
      let action2 = GameState.getCurrentPlayer().combatQueue[1];
      let action3 = GameState.getCurrentPlayer().combatQueue[2];
      if (action0 != undefined) {
        if (this.LBL_QUEUE0.getFillTextureName() != action0.icon) {
          this.LBL_QUEUE0.setFillTextureName(action0.icon);
          TextureLoader.tpcLoader.fetch(action0.icon, texture => {
            this.LBL_QUEUE0.setFillTexture(texture);
          });
        }
      } else {
        this.LBL_QUEUE0.setFillTextureName('');
        this.LBL_QUEUE0.setFillTexture(undefined);
      }
      if (action1 != undefined) {
        if (this.LBL_QUEUE1.getFillTextureName() != action1.icon) {
          this.LBL_QUEUE1.setFillTextureName(action1.icon);
          TextureLoader.tpcLoader.fetch(action1.icon, texture => {
            this.LBL_QUEUE1.setFillTexture(texture);
          });
        }
      } else {
        this.LBL_QUEUE1.setFillTextureName('');
        this.LBL_QUEUE1.setFillTexture(undefined);
      }
      if (action2 != undefined) {
        if (this.LBL_QUEUE2.getFillTextureName() != action2.icon) {
          this.LBL_QUEUE2.setFillTextureName(action2.icon);
          TextureLoader.tpcLoader.fetch(action2.icon, texture => {
            this.LBL_QUEUE2.setFillTexture(texture);
          });
        }
      } else {
        this.LBL_QUEUE2.setFillTextureName('');
        this.LBL_QUEUE2.setFillTexture(undefined);
      }
      if (action3 != undefined) {
        if (this.LBL_QUEUE3.getFillTextureName() != action3.icon) {
          this.LBL_QUEUE3.setFillTextureName(action3.icon);
          TextureLoader.tpcLoader.fetch(action3.icon, texture => {
            this.LBL_QUEUE3.setFillTexture(texture);
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

  Show() {
    super.Show();
    GameState.MenuActive = false;
    this.BTN_ACTIONDOWN0.flipY();
    this.BTN_ACTIONDOWN1.flipY();
    this.BTN_ACTIONDOWN2.flipY();
    this.BTN_ACTIONDOWN3.flipY();
    this.BTN_ACTIONDOWN4.flipY();
    this.BTN_ACTIONDOWN5.flipY();
  }

  Resize() {
    this.RecalculatePosition();
  }
  
}
