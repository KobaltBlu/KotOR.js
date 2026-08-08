import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { FeedbackOption } from "@/enums/engine/FeedbackOption";
import { GameMenu, LBL_MapView, GUIPanelCoordFlags } from "@/gui";
import type { GUILabel, GUIButton, GUICheckBox, GUIProgressBar } from "@/gui";
import { TextureLoader } from "@/loaders";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import * as THREE from "three";
import { Anchor } from "@/enums/gui/Anchor";
import { SSFType } from "@/enums/resource/SSFType";
import { TalentObject } from "@/talents";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { BitWise } from "@/utility/BitWise";
import { KeyMapAction, ModuleObjectType } from "@/enums";
import type { ModuleObject } from "@/module/ModuleObject";
import { FollowerCamera } from "@/engine/FollowerCamera";

const TLK_TOOLTIP_FULL_HEALTH = 42498;

const TLK_TOOLTIP_SOLOMODE = 48035;
const TLK_TOOLTIP_STEALTH = 247;
const TLK_TOOLTIP_PAUSE = 48019;
/** Retail clear_all_button field4_0x24 / CancleCombat tooltip */
const TLK_TOOLTIP_CLEARALL = 48518;
/** Retail clear_one_button field4_0x24 / ClearOneAction tooltip */
const TLK_TOOLTIP_CLEARONE = 48456;

const TLK_TOOLTIP_QUEST     = 48218;
const TLK_TOOLTIP_EQUIPMENT = 48219;
const TLK_TOOLTIP_INVENTORY = 48220;
const TLK_TOOLTIP_MAP       = 48221;
const TLK_TOOLTIP_OPTIONS   = 48222;
const TLK_TOOLTIP_MESSAGES  = 48223;
const TLK_TOOLTIP_ABILITIES = 48224;
const TLK_TOOLTIP_CHARACTER = 48225;

const TLK_TOOLTIP_FRIENDLY_POWER = 48486;
const TLK_TOOLTIP_FRIENDLY_ITEM = 48291;
const TLK_TOOLTIP_FRIENDLY_NON_MEDICAL_ITEM = 48299;
const TLK_TOOLTIP_FRIENDLY_MINE = 48295;

const preloadTextures = ['enemy_bar', 'hostilearrow', 'friend_bar', 'friendlyarrow'];
const preloadTexturesMap = new Map<string, OdysseyTexture>();

const ARROW_SCALE = 32;
const ARROW_DIR_LEFT = 0;
const ARROW_DIR_DOWN = Math.PI / 2;
const ARROW_DIR_RIGHT = Math.PI;
const ARROW_DIR_UP = -Math.PI / 2;
/** Retail PositionMenu / UpdateIndicator edge inset (0x20). */
const TARGET_MENU_EDGE = 0x20;

/** Screen-space menu anchor from CSWCCreature::GetMenuPoint / object vtable 0x13c. */
type TargetMenuPoint = {
  x: number;
  y: number;
  /** 1 = in front of camera, 2 = behind / off-axis (edge treatment). */
  status: 0 | 1 | 2;
};

/** Clamp rect from LBL_ARROW_MARGIN + LBL_MENUBG + TB_PAUSE (MainInterface ctor). */
type TargetMenuBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Relative layout captured from GUI extents (CSWGuiTargetActionMenu::Initialize). */
type TargetMenuLayout = {
  menuWidth: number;
  /** PB_HEALTH.top - (LBL_NAME.top + LBL_NAME.height) */
  healthGap: number;
  /** BTN_TARGET0.top - (LBL_NAME.top + LBL_NAME.height) */
  actionGap: number;
  /** BTN_TARGET0.left - LBL_NAME.left (retail inset under nameplate) */
  actionOffsetLeft: number;
  healthHeight: number;
  actionButtonWidth: number;
  actionButtonHeight: number;
  actionLabelLeft: number;
  actionLabelTop: number;
  actionUpLeft: number;
  actionUpTop: number;
  actionDownLeft: number;
  actionDownTop: number;
  actionSlotStride: number;
};

/**
 * InGameOverlay class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameOverlay.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  namePlateArrow: THREE.Mesh;
  namePlateArrowMaterial: THREE.MeshBasicMaterial;

  /** CSWGuiTargetActionMenu layout gaps / width from GUI init. */
  targetMenuLayout: TargetMenuLayout;
  targetScreenPosition: THREE.Vector3 = new THREE.Vector3();
  reticlePosition: THREE.Vector3 = new THREE.Vector3();
  reticleScreenPosition: THREE.Vector3 = new THREE.Vector3();
  #menuPointWorld: THREE.Vector3 = new THREE.Vector3();
  #menuPointNdc: THREE.Vector3 = new THREE.Vector3();
  #camForward: THREE.Vector3 = new THREE.Vector3();

  constructor(){
    super();
    this.gui_resref = 'mipc28x6';
    this.background = '';
    this.voidFill = false;
    this.enablePositionScaling = true;
    this.userCanClose = false;
    // Retail HUD docks to 640×480 letterbox (not centered modal panels).
    this.panelCoordFlags =
      GUIPanelCoordFlags.UseExtentOffset |
      GUIPanelCoordFlags.DockDesignX |
      GUIPanelCoordFlags.DockDesignY;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>(async (resolve, reject) => {
      this.tGuiPanel.widget.userData.fill.visible = false;
      //this.TB_STEALTH.hideBorder();
      //this.TB_PAUSE.hideBorder();
      //this.TB_SOLO.hideBorder();
      this.LBL_MENUBG.setDepthMode(2);

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
      // Retail ShowActionQueue(0) — combat queue starts hidden
      this.hideCombatUI();
      //this.BTN_CLEARALL.hideBorder();


      this.BTN_MSG.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuMessages.open();
      }).setKeymapAction(KeyMapAction.Messages).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_MESSAGES].Value
      );

      this.BTN_JOU.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuJournal.open();
      }).setKeymapAction(KeyMapAction.Quests).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_QUEST].Value
      );

      this.BTN_MAP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuMap.open();
      }).setKeymapAction(KeyMapAction.Map).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_MAP].Value
      );

      this.BTN_OPT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuOptions.open();
      }).setKeymapAction(KeyMapAction.Options).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_OPTIONS].Value
      );

      this.BTN_CHAR.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuCharacter.open();
      }).setKeymapAction(KeyMapAction.Character).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_CHARACTER].Value
      );

      this.BTN_ABI.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuAbilities.open();
      }).setKeymapAction(KeyMapAction.SkillsAndFeats).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_ABILITIES].Value
      );

      this.BTN_INV.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuInventory.open();
      }).setKeymapAction(KeyMapAction.Inventory).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_INVENTORY].Value
      );

      this.BTN_EQU.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuEquipment.open();
      }).setKeymapAction(KeyMapAction.Equip).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_EQUIPMENT].Value
      );

      // Retail OnPauseButtonPressed — SetPausedByCombat toggle reason 4, clear auto-pause
      this.TB_PAUSE.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.AutoPauseManager.ToggleManualPause();
      }).setKeymapAction(KeyMapAction.Pause).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_PAUSE].Value
      );

      this.TB_SOLO.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.PartyManager.setSoloMode(!GameState.SOLOMODE);
      }).setKeymapAction(KeyMapAction.PartyActive).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_SOLOMODE].Value
      );

      this.TB_STEALTH.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onStealthToggle();
      }).setKeymapAction(KeyMapAction.STEALTH).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_STEALTH].Value
      );

      this.BTN_CHAR1.addEventListener('click', (e) => {
        if(GameState.PartyManager.party[0].canLevelUp()){
          this.manager.MenuCharacter.open();
        }else{
          this.manager.MenuEquipment.open();
        }
      });

      this.BTN_CHAR2.addEventListener('click', (e) => {
        GameState.PartyManager.SwitchLeaderAtIndex(2);
        switch(Math.floor(Math.random() * (4 - 1) + 1)){
          case 2:
            GameState.PartyManager.party[0].playSoundSet(SSFType.SELECT_2);
          break;
          case 3:
            GameState.PartyManager.party[0].playSoundSet(SSFType.SELECT_3);
          break;
          default:
            GameState.PartyManager.party[0].playSoundSet(SSFType.SELECT_1);
          break;
        }
      });

      this.BTN_CHAR3.addEventListener('click', (e) => {
        GameState.PartyManager.SwitchLeaderAtIndex(1);
        switch(Math.floor(Math.random() * (4 - 1) + 1)){
          case 2:
            GameState.PartyManager.party[0].playSoundSet(SSFType.SELECT_2);
          break;
          case 3:
            GameState.PartyManager.party[0].playSoundSet(SSFType.SELECT_3);
          break;
          default:
            GameState.PartyManager.party[0].playSoundSet(SSFType.SELECT_1);
          break;
        }
      });

      // Retail OnClearAllButtonPressed → ClearAllActions @ 006887d0 (keymap CancleCombat / 0xf0)
      this.BTN_CLEARALL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onClearAllButtonPressed();
      }).setKeymapAction(KeyMapAction.CancleCombat).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_CLEARALL]?.Value ?? ''
      );

      // Retail OnClearOneButtonPressed → OnCombatYButton @ 006880c0 (keymap ClearOneAction / 0xf5)
      const onClearOne = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        this.onClearOneButtonPressed();
      };
      if(this.BTN_CLEARONE){
        this.BTN_CLEARONE.addEventListener('click', onClearOne)
          .setKeymapAction(KeyMapAction.ClearOneAction)
          .setTooltipText(GameState.TLKManager.TLKStrings[TLK_TOOLTIP_CLEARONE]?.Value ?? '');
      }
      if(this.BTN_CLEARONE2){
        this.BTN_CLEARONE2.addEventListener('click', onClearOne)
          .setKeymapAction(KeyMapAction.ClearOneAction)
          .setTooltipText(GameState.TLKManager.TLKStrings[TLK_TOOLTIP_CLEARONE]?.Value ?? '');
      }

      this.LBL_QUEUE0.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.getCurrentPlayer()?.clearCombatAction();
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

      for(let i = 0; i < GameState.ActionMenuManager.TARGET_MENU_COUNT; i++){

        this.getControlByName('LBL_TARGET'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          GameState.ActionMenuManager.onTargetMenuAction(i);
        });

        this.getControlByName('BTN_TARGETUP'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          GameState.ActionMenuManager.ActionPanels.targetPanels[i].previousAction();
          this.UpdateTargetUIIcon(i);
          GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.ActionMenuUsed);
        });

        this.getControlByName('BTN_TARGETDOWN'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          GameState.ActionMenuManager.ActionPanels.targetPanels[i].nextAction();
          this.UpdateTargetUIIcon(i);
          GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.ActionMenuUsed);
        });

      }

      for(let i = 0; i < GameState.ActionMenuManager.SELF_MENU_COUNT; i++){

        this.getControlByName('LBL_ACTION'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          GameState.ActionMenuManager.onSelfMenuAction(i);
        });

        this.getControlByName('BTN_ACTIONUP'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          GameState.ActionMenuManager.ActionPanels.selfPanels[i].previousAction();
          this.UpdateSelfUIIcon(i);
          this.UpdateActionDescription();
          GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.ActionMenuUsed);
        });

        this.getControlByName('BTN_ACTIONDOWN'+i).addEventListener('click', (e) => {
          e.stopPropagation();
          GameState.ActionMenuManager.ActionPanels.selfPanels[i].nextAction();
          this.UpdateSelfUIIcon(i);
          this.UpdateActionDescription();
          GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.ActionMenuUsed);
        });

      }

      this.BTN_ACTION0.setKeymapAction(KeyMapAction.PersonalPowerAct).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_FRIENDLY_POWER].Value
      );
      this.BTN_ACTION1.setKeymapAction(KeyMapAction.PersonalMedicalAct).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_FRIENDLY_ITEM].Value
      );
      this.BTN_ACTION2.setKeymapAction(KeyMapAction.PersonalOtherAct).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_FRIENDLY_NON_MEDICAL_ITEM].Value
      );
      this.BTN_ACTION3.setKeymapAction(KeyMapAction.PersonalMinesAct).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_FRIENDLY_MINE].Value
      );

      this.BTN_MINIMAP.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuMap.open();
      }).setKeymapAction(KeyMapAction.Map).setTooltipText(
        GameState.TLKManager.TLKStrings[TLK_TOOLTIP_MAP].Value
      );

      for(const texture of preloadTextures){
        const tex = await TextureLoader.Load(texture);
        preloadTexturesMap.set(texture, tex);
      }

      const arrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
      const arrowMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: false, blending: THREE.AdditiveBlending } );
      arrowMaterial.map = preloadTexturesMap.get('friendlyarrow');
      this.namePlateArrowMaterial = arrowMaterial;
      this.namePlateArrow = new THREE.Mesh( arrowGeometry, arrowMaterial );
      this.namePlateArrow.scale.x = 32;
      this.namePlateArrow.scale.y = 32;
      this.namePlateArrow.renderOrder = 5;
      this.namePlateArrow.visible = false;
      this.tGuiPanel.widget.add(this.namePlateArrow);

      this.captureTargetMenuLayout();

      // this.LBL_COMBATBG2.visible = false;
      resolve();
    });
  }

  /**
   * Retail CSWGuiTargetActionMenu::Initialize — store width_ and vertical gaps
   * between name, health bar, and target action buttons from GUI extents.
   */
  captureTargetMenuLayout() {
    const name = this.LBL_NAME;
    const health = this.PB_HEALTH;
    const btn0 = this.BTN_TARGET0;
    if(!name || !health || !btn0){
      return;
    }

    const nameBottom = name.extent.top + name.extent.height;
    const btn1 = this.BTN_TARGET1;
    const lbl0 = this.LBL_TARGET0;
    const up0 = this.BTN_TARGETUP0;
    const down0 = this.BTN_TARGETDOWN0;
    this.targetMenuLayout = {
      menuWidth: name.extent.width,
      healthGap: health.extent.top - nameBottom,
      actionGap: btn0.extent.top - nameBottom,
      // mipc28x6: name L=0, BTN_TARGET0 L=43 — actions are inset under the plate
      actionOffsetLeft: btn0.extent.left - name.extent.left,
      healthHeight: health.extent.height,
      actionButtonWidth: btn0.extent.width,
      actionButtonHeight: btn0.extent.height,
      actionLabelLeft: (lbl0?.extent.left ?? btn0.extent.left) - btn0.extent.left,
      actionLabelTop: (lbl0?.extent.top ?? btn0.extent.top) - btn0.extent.top,
      actionUpLeft: (up0?.extent.left ?? btn0.extent.left) - btn0.extent.left,
      actionUpTop: (up0?.extent.top ?? btn0.extent.top) - btn0.extent.top,
      actionDownLeft: (down0?.extent.left ?? btn0.extent.left) - btn0.extent.left,
      actionDownTop: (down0?.extent.top ?? btn0.extent.top) - btn0.extent.top,
      actionSlotStride: btn1
        ? (btn1.extent.left - btn0.extent.left)
        : (btn0.extent.width + 5),
    };
  }

  /**
   * Retail CSWGuiMainInterface::ClearAllActions @ 006887d0
   * (OnClearAllButtonPressed / CancleCombat keymap).
   * Client SetCombatMode(0) → restore combat camera, then ClearAllActions(1)
   * + RemoveAllActions (server ClearAllActions path). Does not CancelCombat /
   * SetCombatState(0).
   */
  onClearAllButtonPressed() {
    const oPC = GameState.getCurrentPlayer();
    if(!oPC) return;
    FollowerCamera.setCombatCameraActive(false);
    oPC.clearAllActions(true);
    // Retail CServerExoApp::ClearAllActions also RemoveAllActions on the round.
    oPC.combatRound?.clearActions?.();
  }

  /**
   * Retail OnCombatYButton @ 006880c0 (OnClearOneButtonPressed / ClearOneAction).
   * RemoveLastAction from the combat round; if the schedule was empty, ClearAllActions(1).
   */
  onClearOneButtonPressed() {
    const oPC = GameState.getCurrentPlayer();
    if(!oPC?.combatRound) return;
    if(!oPC.combatRound.removeLastAction()){
      oPC.clearAllActions(true);
    }
  }

  showCombatUI() {
    this.BTN_CLEARALL?.show();
    this.BTN_CLEARONE?.show();
    this.BTN_CLEARONE2?.show();
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
    this.BTN_CLEARONE2?.hide();
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
      if (!GameState.module.area.miniGame && GameState.PartyManager.party[nth]) {
        switch (nth) {
        case 0:
          if (GameState.PartyManager.party[nth].canLevelUp()) {
            this.getControlByName('LBL_LEVELUP1').pulsing = true;
            this.getControlByName('LBL_LEVELUP1')?.show();
          } else {
            this.getControlByName('LBL_LEVELUP1')?.hide();
          }
          break;
        case 1:
          if (GameState.PartyManager.party[nth].canLevelUp()) {
            this.getControlByName('LBL_LEVELUP3').pulsing = true;
            this.getControlByName('LBL_LEVELUP3')?.show();
          } else {
            this.getControlByName('LBL_LEVELUP3')?.hide();
          }
          break;
        case 2:
          if (GameState.PartyManager.party[nth].canLevelUp()) {
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
      TextureLoader.Load(sTexture).then((texture: OdysseyTexture) => {
        this.miniMap.setTexture(texture);
      });
    } catch (e: any) {
      console.error(e);
    }
  }

  _canShowTargetUI() {
    if (BitWise.InstanceOfObject(GameState.CursorManager.selectedObject, ModuleObjectType.ModuleCreature) && GameState.CursorManager.selectedObject.isDead())
      return false;
    // Retail still shows edge arrow + nameplate when reticle is off-screen (UpdateIndicator status 2)
    return (
      !this.manager.MenuContainer.bVisible &&
      !!GameState.CursorManager.selectedObject &&
      BitWise.InstanceOfObject(GameState.CursorManager.selectedObject, ModuleObjectType.ModuleObject) &&
      !BitWise.InstanceOfObject(GameState.CursorManager.selectedObject, ModuleObjectType.ModuleRoom)
    );
  }

  UpdateTargetUIIcon(index = 0) {
    const guiControl = this.getControlByName('LBL_TARGET' + index);
    if (!GameState.ActionMenuManager.ActionPanels.targetPanels[index].actions.length) {
      guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
      guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
      guiControl.setFillTextureName('');
      return;
    }

    const action = GameState.ActionMenuManager.ActionPanels.targetPanels[index].getSelectedAction();
    if (!action) {
      guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
      guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
      guiControl.setFillTextureName('');
      return;
    }

    if (guiControl.getFillTextureName() != action.icon) {
      guiControl.setFillTextureName(action.icon);
      guiControl.setHighlightFillTexture(action.icon);
      TextureLoader.tpcLoader.fetch(action.icon).then((texture: OdysseyTexture) => {
        guiControl.setMaterialTexture(guiControl.border.fill.material, texture);
        guiControl.setMaterialTexture(guiControl.highlight.fill.material, texture);
        guiControl.border.fill.material.transparent = true;
        guiControl.highlight.fill.material.transparent = true;
        this.applyActionIconEnabled(guiControl, action.enabled !== false);
      });
    } else {
      this.applyActionIconEnabled(guiControl, action.enabled !== false);
    }
  }

  UpdateSelfUIIcon(index = 0) {
    const guiControl = this.getControlByName('LBL_ACTION' + index);
    if (GameState.ActionMenuManager.ActionPanels.selfPanels[index].actions.length) {
      const action = GameState.ActionMenuManager.ActionPanels.selfPanels[index].getSelectedAction();
      if (action && guiControl.getFillTextureName() != action.icon) {
        guiControl.setFillTextureName(action.icon);
        guiControl.setHighlightFillTexture(action.icon);
        TextureLoader.tpcLoader.fetch(action.icon).then((texture: OdysseyTexture) => {
          guiControl.setMaterialTexture(guiControl.border.fill.material, texture);
          guiControl.setMaterialTexture(guiControl.highlight.fill.material, texture);
          guiControl.border.fill.material.transparent = true;
          guiControl.highlight.fill.material.transparent = true;
          this.applyActionIconEnabled(guiControl, action.enabled !== false);
        });
      } else if (action) {
        this.applyActionIconEnabled(guiControl, action.enabled !== false);
      } else if (!action) {
        guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
        guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
        guiControl.setFillTextureName('');
      }
    } else {
      guiControl.setMaterialTexture(guiControl.border.fill.material, undefined);
      guiControl.setMaterialTexture(guiControl.highlight.fill.material, undefined);
      guiControl.setFillTextureName('');
    }
  }

  applyActionIconEnabled(guiControl: GUIButton, enabled: boolean){
    const alpha = enabled ? 1.0 : 0.25;
    try{
      if(guiControl.border?.fill?.material?.uniforms?.opacity){
        guiControl.border.fill.material.uniforms.opacity.value = alpha;
      }
      if(guiControl.highlight?.fill?.material?.uniforms?.opacity){
        guiControl.highlight.fill.material.uniforms.opacity.value = alpha;
      }
    }catch(e){}
    guiControl.disableSelection = !enabled;
  }

  /**
   * Retail OnStealthButtonPressed → PartyMenuStealth (solo-mode query when party > 1).
   */
  onStealthToggle(){
    const pc = GameState.getCurrentPlayer();
    if(!pc?.isStealthCapable?.()) return;

    const partyCount = GameState.PartyManager?.party?.length || 1;
    if(!GameState.SOLOMODE && partyCount > 1 && !pc.stealthMode){
      // Entering stealth with companions requires solo mode confirmation
      this.manager.InGameConfirm.showConfirmDialog(
        TLK_TOOLTIP_SOLOMODE,
        () => {
          GameState.PartyManager.setSoloMode(true);
          this.TB_SOLO?.setValue?.(true);
          pc.toggleStealthMode();
          this.TB_STEALTH?.setValue?.(pc.stealthMode);
        },
        () => {
          this.TB_STEALTH?.setValue?.(pc.stealthMode);
        }
      );
      return;
    }

    pc.toggleStealthMode();
    this.TB_STEALTH?.setValue?.(pc.stealthMode);
  }

  UpdateActionDescription(){
    if(!this.LBL_ACTIONDESC) return;
    let desc = '';
    for(let i = 0; i < GameState.ActionMenuManager.SELF_MENU_COUNT; i++){
      const selected = GameState.ActionMenuManager.ActionPanels.selfPanels[i]?.getSelectedAction();
      if(selected?.name){
        desc = selected.name;
        break;
      }
    }
    if(!desc){
      for(let i = 0; i < GameState.ActionMenuManager.TARGET_MENU_COUNT; i++){
        const selected = GameState.ActionMenuManager.ActionPanels.targetPanels[i]?.getSelectedAction();
        if(selected?.name){
          desc = selected.name;
          break;
        }
      }
    }
    if(desc){
      this.LBL_ACTIONDESC.setText(desc);
      this.LBL_ACTIONDESC.show();
      this.LBL_ACTIONDESCBG?.show();
    }else{
      this.LBL_ACTIONDESC.hide();
      this.LBL_ACTIONDESCBG?.hide();
    }
  }

  /**
   * Retail CSWCCreature::GetMenuPoint @ 0060ff30 / object vtable+0x13c.
   * Returns top-left screen pixels and visibility status (1 front, 2 behind).
   */
  getTargetMenuPoint(selectedObject: ModuleObject): TargetMenuPoint {
    const vpW = GameState.ResolutionManager.getViewportWidth();
    const vpH = GameState.ResolutionManager.getViewportHeight();
    const camera = GameState.currentCamera;
    if(!camera || !selectedObject){
      return { x: vpW / 2, y: vpH / 2, status: 0 };
    }

    if(BitWise.InstanceOfObject(selectedObject, ModuleObjectType.ModuleCreature)){
      this.#menuPointWorld.copy(selectedObject.position);
      const tag = (selectedObject.tag || '').toLowerCase();
      // Retail: +2.0 for zaalbar/hk47, else +1.75
      this.#menuPointWorld.z += (tag === 'zaalbar' || tag === 'hk47') ? 2.0 : 1.75;
    }else{
      const node = selectedObject.getReticleNode?.();
      if(node){
        node.getWorldPosition(this.#menuPointWorld);
      }else{
        this.#menuPointWorld.copy(selectedObject.position);
      }
    }

    this.reticlePosition.copy(this.#menuPointWorld);

    // Do NOT call camera.getWorldDirection() — it runs updateWorldMatrix() and
    // desyncs matrixWorld from matrixWorldInverse mid-frame, which corrupts
    // GameState frustum / currentCameraPosition while the camera turns.
    // FollowerCamera forward is local +Y (Z-up, YZX).
    this.#camForward.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const toPointX = this.#menuPointWorld.x - camera.position.x;
    const toPointY = this.#menuPointWorld.y - camera.position.y;
    const toPointZ = this.#menuPointWorld.z - camera.position.z;
    const inFront = (toPointX * this.#camForward.x + toPointY * this.#camForward.y + toPointZ * this.#camForward.z) > 0;
    const status: 1 | 2 = inFront ? 1 : 2;

    this.#menuPointNdc.copy(this.#menuPointWorld).project(camera);
    const x = (this.#menuPointNdc.x * 0.5 + 0.5) * vpW;
    const y = (-this.#menuPointNdc.y * 0.5 + 0.5) * vpH;
    this.reticleScreenPosition.set(x, y, 0);
    return { x, y, status };
  }

  /**
   * Retail MainInterface ctor clamp rect:
   * left = arrow_margin.left
   * top = menubg.top + menubg.height
   * width = viewportWidth - 2 * arrow_margin.left
   * height = pause.top - top
   */
  getTargetMenuBounds(): TargetMenuBounds {
    const vpW = GameState.ResolutionManager.getViewportWidth();
    const vpH = GameState.ResolutionManager.getViewportHeight();
    const panelW = this.tGuiPanel?.extent?.width || 640;
    const panelH = this.tGuiPanel?.extent?.height || 480;
    const sx = vpW / panelW;
    const sy = vpH / panelH;

    const marginLeft = (this.LBL_ARROW_MARGIN?.extent.left ?? 0) * sx;
    const menuBg = this.LBL_MENUBG?.extent;
    const marginTop = menuBg ? (menuBg.top + menuBg.height) * sy : 0;
    const pauseTop = (this.TB_PAUSE?.extent.top ?? panelH) * sy;

    return {
      left: marginLeft,
      top: marginTop,
      width: Math.max(0, vpW - marginLeft * 2),
      height: Math.max(0, pauseTop - marginTop),
    };
  }

  /**
   * Retail CSWGuiTargetActionMenu::PositionMenu @ 00686090.
   * Positions the floating target menu viewport origin (top-left screen pixels).
   */
  positionTargetMenu(point: TargetMenuPoint, menuWidth: number, menuHeight: number): { x: number; y: number } {
    const bounds = this.getTargetMenuBounds();
    const halfW = menuWidth / 2;
    let menuX = 0;
    let menuY = 0;
    const screenX = point.x;
    const screenY = point.y;
    const edge = TARGET_MENU_EDGE;

    if(point.status === 2){
      // Behind camera: pin to left/right half and vertical edges
      menuX = screenX <= GameState.ResolutionManager.getViewportWidth() / 2
        ? bounds.left
        : bounds.left + bounds.width - menuWidth;

      if(screenY < bounds.top + edge){
        menuY = (bounds.top + bounds.height) - menuHeight - edge;
      }else if(screenY > bounds.top + bounds.height - edge){
        menuY = bounds.top;
      }else if(screenY < GameState.ResolutionManager.getViewportHeight() / 2){
        menuY = GameState.ResolutionManager.getViewportHeight() - Math.floor(menuHeight + screenY + edge);
      }else{
        menuY = Math.floor(screenY - edge - menuHeight);
      }
    }else{
      // In front: center on point horizontally; place menu above point with 32px gap
      if(screenX - halfW < bounds.left){
        menuX = bounds.left;
        if(screenY < bounds.top + edge){
          menuY = bounds.top;
        }else if(screenY > bounds.top + bounds.height - edge){
          menuY = bounds.top + bounds.height - menuHeight - edge;
        }else{
          menuY = Math.floor(screenY - edge - menuHeight);
        }
      }else if(screenX + halfW > bounds.left + bounds.width){
        menuX = bounds.left + bounds.width - menuWidth;
        if(screenY < bounds.top + edge){
          menuY = bounds.top;
        }else if(screenY > bounds.top + bounds.height - edge){
          menuY = bounds.top + bounds.height - menuHeight - edge;
        }else{
          menuY = Math.floor(screenY - edge - menuHeight);
        }
      }else{
        menuX = Math.floor(screenX - halfW);
        if(screenY < bounds.top + edge){
          menuY = bounds.top;
        }else if(screenY > bounds.top + bounds.height - edge){
          menuY = bounds.top + bounds.height - menuHeight - edge;
        }else{
          menuY = Math.floor(screenY - edge - menuHeight);
        }
      }
    }

    // Final clamp (PositionMenu epilogue)
    const maxX = bounds.left + bounds.width - menuWidth;
    const maxY = bounds.top + bounds.height - menuHeight;
    menuX = Math.min(Math.max(menuX, bounds.left), maxX);
    menuY = Math.min(Math.max(menuY, bounds.top), maxY);
    return { x: menuX, y: menuY };
  }

  placeUserControl(control: GUILabel | GUIButton | GUIProgressBar | undefined, left: number, top: number, width?: number, height?: number) {
    if(!control) return;
    control.scale = false;
    control.anchor = Anchor.User;
    control.extent.left = left;
    control.extent.top = top;
    if(typeof width === 'number') control.extent.width = width;
    if(typeof height === 'number') control.extent.height = height;
    control.recalculate();
  }

  /**
   * Retail CSWGuiMainInterface::UpdateIndicator edge-arrow path when target is
   * outside LBL_ARROW_MARGIN (or behind camera). On-screen reticles stay in CursorManager.
   */
  updateArrow(selectedObject: ModuleObject, point?: TargetMenuPoint) {
    if(!this.namePlateArrow){
      return;
    }
    if(!selectedObject || !point || point.status === 0){
      this.namePlateArrow.visible = false;
      return;
    }

    const margin = this.LBL_ARROW_MARGIN?.extent;
    const panelW = this.tGuiPanel?.extent?.width || 640;
    const panelH = this.tGuiPanel?.extent?.height || 480;
    const vpW = GameState.ResolutionManager.getViewportWidth();
    const vpH = GameState.ResolutionManager.getViewportHeight();
    const sx = vpW / panelW;
    const sy = vpH / panelH;

    const marginLeft = (margin?.left ?? 0) * sx;
    const marginTop = (margin?.top ?? 0) * sy;
    const marginW = (margin?.width ?? panelW) * sx;
    const marginH = (margin?.height ?? panelH) * sy;
    const marginRight = marginLeft + marginW;
    const marginBottom = marginTop + marginH;

    const screenX = point.x;
    const screenY = point.y;
    const inside =
      point.status === 1 &&
      screenX >= marginLeft + TARGET_MENU_EDGE &&
      screenX <= marginRight - TARGET_MENU_EDGE &&
      screenY >= marginTop + TARGET_MENU_EDGE &&
      screenY <= marginBottom - TARGET_MENU_EDGE;

    // On-screen inside margin: retail draws the world reticle, not the edge arrow
    if(inside){
      this.namePlateArrow.visible = false;
      return;
    }

    this.namePlateArrow.visible = true;
    let arrowLeft = screenX;
    let arrowTop = screenY;
    let size = ARROW_SCALE;
    let rotation = ARROW_DIR_DOWN;

    if(screenX < marginLeft + TARGET_MENU_EDGE){
      arrowLeft = marginLeft;
      rotation = ARROW_DIR_LEFT;
      size = ARROW_SCALE;
      if(screenY < marginTop + TARGET_MENU_EDGE){
        arrowTop = marginTop;
      }else if(screenY > marginBottom - TARGET_MENU_EDGE){
        arrowTop = marginBottom - size;
      }else{
        arrowTop = Math.floor(screenY - size / 2);
      }
    }else if(screenX > marginRight - TARGET_MENU_EDGE){
      arrowLeft = marginRight - size;
      rotation = ARROW_DIR_RIGHT;
      size = ARROW_SCALE;
      if(screenY < marginTop + TARGET_MENU_EDGE){
        arrowTop = marginTop;
      }else if(screenY > marginBottom - TARGET_MENU_EDGE){
        arrowTop = marginBottom - size;
      }else{
        arrowTop = Math.floor(screenY - size / 2);
      }
    }else if(screenY < marginTop + TARGET_MENU_EDGE){
      arrowTop = marginTop;
      rotation = ARROW_DIR_UP;
      size = ARROW_SCALE;
      arrowLeft = Math.floor(screenX - size / 2);
    }else{
      arrowTop = marginBottom - size;
      rotation = ARROW_DIR_DOWN;
      size = ARROW_SCALE;
      arrowLeft = Math.floor(screenX - size / 2);
    }

    arrowLeft = Math.min(Math.max(arrowLeft, marginLeft), marginRight - size);
    arrowTop = Math.min(Math.max(arrowTop, marginTop), marginBottom - size);

    // Mesh lives in panel-centered GUI space (Y up)
    this.namePlateArrow.position.x = -vpW / 2 + arrowLeft + size / 2;
    this.namePlateArrow.position.y = vpH / 2 - arrowTop - size / 2;
    this.namePlateArrow.rotation.z = rotation;
    this.namePlateArrow.scale.set(size, size, 1);
    this.namePlateArrow.renderOrder = 5;
  }

  UpdateTargetUIPanels() {
    if (!this._canShowTargetUI()) {
      GameState.ActionMenuManager.SetTarget(undefined);
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
      this.updateArrow(undefined);
      return;
    }

    const selected = GameState.CursorManager.selectedObject;
    const isHostile = BitWise.InstanceOfObject(selected, ModuleObjectType.ModuleCreature)
      && selected.isHostile(GameState.getCurrentPlayer());

    if (isHostile) {
      if (this.PB_HEALTH.getFillTextureName() != 'enemy_bar') {
        this.PB_HEALTH.setFillTextureName('enemy_bar');
        this.PB_HEALTH.setFillTexture(preloadTexturesMap.get('enemy_bar'));
      }
      if (this.namePlateArrowMaterial) {
        this.namePlateArrowMaterial.map = preloadTexturesMap.get('hostilearrow');
      }
    } else {
      if (this.PB_HEALTH.getFillTextureName() != 'friend_bar') {
        this.PB_HEALTH.setFillTextureName('friend_bar');
        this.PB_HEALTH.setFillTexture(preloadTexturesMap.get('friend_bar'));
      }
      if (this.namePlateArrowMaterial) {
        this.namePlateArrowMaterial.map = preloadTexturesMap.get('friendlyarrow');
      }
    }

    if (this.LBL_NAME.text.text != selected.getName()) {
      this.LBL_NAME.setText(selected.getName(), 25);
    }

    let health = 100 * Math.min(Math.max(selected.getHP() / selected.getMaxHP(), 0), 1);
    if (health > 100) health = 100;
    this.PB_HEALTH.setProgress(health);

    const point = this.getTargetMenuPoint(selected);
    this.updateArrow(selected, point);

    const layout = this.targetMenuLayout;
    const menuWidth = layout?.menuWidth || this.LBL_NAME.extent.width;
    // Retail SetNameLabel: name height from ideal text height, then stack health/actions
    const nameHeight = Math.max(this.LBL_NAME.getTextSize()?.y || 0, this.LBL_NAME.extent.height);
    const healthGap = layout?.healthGap ?? 0;
    const actionGap = layout?.actionGap ?? 0;
    const healthHeight = layout?.healthHeight ?? this.PB_HEALTH.extent.height;
    const hasActions = !!GameState.ActionMenuManager.targetActionCount();
    const actionBottom = hasActions
      ? (actionGap + (layout?.actionButtonHeight ?? 0))
      : 0;
    const healthBottom = healthGap + healthHeight;
    const menuHeight = nameHeight + Math.max(healthBottom, actionBottom);

    const menuPos = this.positionTargetMenu(point, menuWidth, menuHeight);
    this.targetScreenPosition.set(menuPos.x, menuPos.y, 0);

    this.LBL_NAME?.show();
    this.LBL_NAMEBG?.show();
    this.PB_HEALTH?.show();
    this.LBL_HEALTHBG?.show();

    this.placeUserControl(this.LBL_NAME, menuPos.x, menuPos.y, menuWidth, nameHeight);
    this.placeUserControl(this.LBL_NAMEBG, menuPos.x, menuPos.y, menuWidth, nameHeight);

    const healthTop = menuPos.y + nameHeight + healthGap;
    this.placeUserControl(this.PB_HEALTH, menuPos.x, healthTop, menuWidth, healthHeight);
    this.placeUserControl(this.LBL_HEALTHBG, menuPos.x, healthTop, menuWidth, healthHeight);

    if (hasActions) {
      const stride = layout?.actionSlotStride ?? (this.BTN_TARGET0.extent.width + 5);
      const actionOffsetLeft = layout?.actionOffsetLeft ?? 43;
      const actionTop = menuPos.y + nameHeight + actionGap;
      for (let i = 0; i < GameState.ActionMenuManager.TARGET_MENU_COUNT; i++) {
        const slotLeft = menuPos.x + actionOffsetLeft + stride * i;
        const btn = this.getControlByName('BTN_TARGET' + i) as GUIButton;
        const lbl = this.getControlByName('LBL_TARGET' + i) as GUIButton;
        const up = this.getControlByName('BTN_TARGETUP' + i) as GUIButton;
        const down = this.getControlByName('BTN_TARGETDOWN' + i) as GUIButton;

        this.placeUserControl(btn, slotLeft, actionTop);
        this.placeUserControl(
          lbl,
          slotLeft + (layout?.actionLabelLeft ?? 2),
          actionTop + (layout?.actionLabelTop ?? 14)
        );
        this.placeUserControl(
          up,
          slotLeft + (layout?.actionUpLeft ?? 0),
          actionTop + (layout?.actionUpTop ?? 1)
        );
        this.placeUserControl(
          down,
          slotLeft + (layout?.actionDownLeft ?? 1),
          actionTop + (layout?.actionDownTop ?? 45)
        );
        if (down) {
          down.widget.rotation.z = Math.PI;
        }

        this.UpdateTargetUIIcon(i);
        btn?.show();
        lbl?.show();

        if (GameState.ActionMenuManager.ActionPanels.targetPanels[i].actions.length <= 1) {
          up?.hide();
          down?.hide();
        } else {
          up?.show();
          down?.show();
        }
      }
    } else {
      for (let i = 0; i < 3; i++) {
        this.getControlByName('BTN_TARGET' + i)?.hide();
        this.getControlByName('LBL_TARGET' + i)?.hide();
        this.getControlByName('BTN_TARGETUP' + i)?.hide();
        this.getControlByName('BTN_TARGETDOWN' + i)?.hide();
      }
    }
  }

  UpdateSelfUIPanels(delta = 0) {
    for (let i = 0; i < GameState.ActionMenuManager.SELF_MENU_COUNT; i++) {
      this.UpdateSelfUIIcon(i);
      this.getControlByName('BTN_ACTIONUP' + i).recalculate();
      this.getControlByName('BTN_ACTIONDOWN' + i).recalculate();
        
      if(GameState.ActionMenuManager.ActionPanels.selfPanels[i].actions.length <= 1){
        this.getControlByName('BTN_ACTIONUP' + i)?.hide();
        this.getControlByName('BTN_ACTIONDOWN' + i)?.hide();
      }else{
        this.getControlByName('BTN_ACTIONUP' + i)?.show();
        this.getControlByName('BTN_ACTIONDOWN' + i)?.show();
      }
    }
  }

  /**
   * Update HUD Notification Icons
   * 
   * @param delta 
   */
  UpdateHUDNotificationIcons(delta = 0){
    if(GameState.UINotificationManager.bNotificationSoundQueued){
      GameState.UINotificationManager.bNotificationSoundQueued = false;
      GameState.guiAudioEmitter.playSoundFireAndForget('gui_quest');
    }
    /**
     * Item Lost
     */
    if(GameState.UINotificationManager.ItemLostTimer > 0){
      this.LBL_ITEMLOST.show();
      this.LBL_ITEMLOST.pulsing = true;
      GameState.UINotificationManager.ItemLostTimer -= delta;
    }else{
      GameState.UINotificationManager.ItemLostTimer = 0;
      this.LBL_ITEMLOST.hide();
    }

    /**
     * Item Received
     */
    if(GameState.UINotificationManager.ItemReceivedTimer > 0){
      this.LBL_ITEMRCVD.show();
      this.LBL_ITEMRCVD.pulsing = true;
      GameState.UINotificationManager.ItemReceivedTimer -= delta;
    }else{
      GameState.UINotificationManager.ItemReceivedTimer = 0;
      this.LBL_ITEMRCVD.hide();
    }

    /**
     * Credits Received
     */
    if(GameState.UINotificationManager.CreditsReceivedTimer > 0){
      this.LBL_CASH.show();   
      this.LBL_CASH.pulsing = true;
      GameState.UINotificationManager.CreditsReceivedTimer -= delta;
    }else{
      GameState.UINotificationManager.CreditsReceivedTimer = 0;
      this.LBL_CASH.hide();
    }

    /**
     * Journal Entry Added
     */
    if(GameState.UINotificationManager.JournalEntryAddedTimer > 0){
      this.LBL_JOURNAL.show();
      this.LBL_JOURNAL.pulsing = true;
      GameState.UINotificationManager.JournalEntryAddedTimer -= delta;
    }else{
      GameState.UINotificationManager.JournalEntryAddedTimer = 0;
      this.LBL_JOURNAL.hide();
    }

    /**
     * Light Shift
     */
    if(GameState.UINotificationManager.LightShiftTimer > 0){
      this.LBL_LIGHTSHIFT.show();
      this.LBL_LIGHTSHIFT.pulsing = true;
      GameState.UINotificationManager.LightShiftTimer -= delta;
    }else{
      GameState.UINotificationManager.LightShiftTimer = 0;
      this.LBL_LIGHTSHIFT.hide();
    }

    /**
     * Dark Shift
     */
    if(GameState.UINotificationManager.DarkShiftTimer > 0){
      this.LBL_DARKSHIFT.show();
      this.LBL_DARKSHIFT.pulsing = true;
      GameState.UINotificationManager.DarkShiftTimer -= delta;
    }else{
      GameState.UINotificationManager.DarkShiftTimer = 0;
      this.LBL_DARKSHIFT.hide();
    }

    /**
     * Plot XP Received
     */
    if(GameState.UINotificationManager.PlotXPReceivedTimer > 0){
      this.LBL_PLOTXP.show();
      this.LBL_PLOTXP.pulsing = true;
      GameState.UINotificationManager.PlotXPReceivedTimer -= delta;
    }else{
      GameState.UINotificationManager.PlotXPReceivedTimer = 0;
      this.LBL_PLOTXP.hide();
    }

    /**
     * Stealth XP Received
     */
    if(GameState.UINotificationManager.StealthXPReceivedTimer > 0){
      this.LBL_STEALTHXP.show();
      this.LBL_STEALTHXP.pulsing = true;
      GameState.UINotificationManager.StealthXPReceivedTimer -= delta;
    }else{
      GameState.UINotificationManager.StealthXPReceivedTimer = 0;
      this.LBL_STEALTHXP.hide();
    }
  }

  /**
   * Retail CGuiInGame::GetMiniMapVisible / InitializeMap —
   * Feedback Mini Map option and minigame gate HUD map border + MapView.
   */
  updateMiniMapVisibility(){
    const hasMap = !!GameState.module?.area?.areaMap?.mapResX;
    const show =
      hasMap &&
      GameState.FeedbackMessageManager.GetFeedbackTypeEnabled(FeedbackOption.MiniMap) &&
      !GameState.module?.area?.miniGame;

    if(show){
      this.LBL_MAPBORDER?.show();
      this.LBL_MAPVIEW?.show();
      this.miniMap?.setVisible(true);
    }else{
      this.LBL_MAPBORDER?.hide();
      this.LBL_MAPVIEW?.hide();
      this.miniMap?.setVisible(false);
    }
  }

  update(delta = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;

    this.updateMiniMapVisibility();
    if (GameState.module.area.miniGame) { return; }

    const oPC = GameState.getCurrentPlayer();
    GameState.ActionMenuManager.SetPC(oPC);
    GameState.ActionMenuManager.SetTarget(GameState.CursorManager.selectedObject);
    GameState.ActionMenuManager.UpdateMenuActions();
    this.UpdateTargetUIPanels();
    this.UpdateSelfUIPanels();
    this.UpdateHUDNotificationIcons(delta);
    const timingBar = GameState.GuiTimingBarManager;
    if(timingBar?.isActive()){
      // Retail only shows the bar for the client-controlled creature.
      const ownerId = timingBar.ownerId;
      if(ownerId < 0 || oPC?.id === ownerId){
        timingBar.update(delta, this);
      }else{
        this.UpdateActionDescription();
      }
    }else{
      timingBar?.restoreOverlay?.(this);
      this.UpdateActionDescription();
    }

    //update minimap — retail uses creature yaw, not camera
    if(this.miniMap?.visible){
      this.miniMap.setPosition(oPC.position.x, oPC.position.y);
      this.miniMap.setRotation(oPC.getFacing());
      this.miniMap.render(delta);
    }

    this.TogglePartyMember(0, false);
    this.TogglePartyMember(1, false);
    this.TogglePartyMember(2, false);
    
    for (let i = 0; i < GameState.PartyManager.party.length; i++) {
      let partyMember = GameState.PartyManager.party[i];
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
      const portraitResRef = partyMember.getPortraitResRef();
      if (pmBG.getFillTextureName() != portraitResRef) {
        pmBG.setFillTextureName(portraitResRef);
        TextureLoader.tpcLoader.fetch(portraitResRef).then((texture: OdysseyTexture) => {
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
    // Retail client combat UI follows CSWCCreature combat state (synced only for Damage reason),
    // not flourish-only SetCombatState(1, SpellCast/2).
    const hostileCombat = typeof oPC.isHostileCombatEngaged === 'function'
      ? oPC.isHostileCombatEngaged()
      : oPC.combatData.combatState;
    if (hostileCombat || oPC.excitedDuration || oPC.combatRound.scheduledActionList.length) {
      this.showCombatUI();
      let action0 = oPC.combatRound.action;
      let action1 = oPC.combatRound.scheduledActionList[0];
      let action2 = oPC.combatRound.scheduledActionList[1];
      let action3 = oPC.combatRound.scheduledActionList[2];
      if (action0 != undefined) {
        if (this.LBL_QUEUE0.getFillTextureName() != action0.iconResRef) {
          this.LBL_QUEUE0.setFillTextureName(action0.iconResRef);
          TextureLoader.tpcLoader.fetch(action0.iconResRef).then((texture: OdysseyTexture) => {
            this.LBL_QUEUE0.setFillTexture(texture);
            this.LBL_QUEUE0.border.fill.material.transparent = true;
          });
        }
      } else {
        this.LBL_QUEUE0.setFillTextureName('');
        this.LBL_QUEUE0.setFillTexture(undefined);
      }
      if (action1 != undefined) {
        if (this.LBL_QUEUE1.getFillTextureName() != action1.iconResRef) {
          this.LBL_QUEUE1.setFillTextureName(action1.iconResRef);
          TextureLoader.tpcLoader.fetch(action1.iconResRef).then((texture: OdysseyTexture) => {
            this.LBL_QUEUE1.setFillTexture(texture);
            this.LBL_QUEUE1.border.fill.material.transparent = true;
          });
        }
      } else {
        this.LBL_QUEUE1.setFillTextureName('');
        this.LBL_QUEUE1.setFillTexture(undefined);
      }
      if (action2 != undefined) {
        if (this.LBL_QUEUE2.getFillTextureName() != action2.iconResRef) {
          this.LBL_QUEUE2.setFillTextureName(action2.iconResRef);
          TextureLoader.tpcLoader.fetch(action2.iconResRef).then((texture: OdysseyTexture) => {
            this.LBL_QUEUE2.setFillTexture(texture);
            this.LBL_QUEUE2.border.fill.material.transparent = true;
          });
        }
      } else {
        this.LBL_QUEUE2.setFillTextureName('');
        this.LBL_QUEUE2.setFillTexture(undefined);
      }
      if (action3 != undefined) {
        if (this.LBL_QUEUE3.getFillTextureName() != action3.iconResRef) {
          this.LBL_QUEUE3.setFillTextureName(action3.iconResRef);
          TextureLoader.tpcLoader.fetch(action3.iconResRef).then((texture: OdysseyTexture) => {
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
    if (GameState.CursorManager.selectedObject) {
      if (typeof GameState.CursorManager.selectedObject.onClick === 'function') {
        const pc = GameState.getCurrentPlayer();
        // Retail AddAttackActions(clear=0) while fighting — do not ClearAllActions.
        if (!pc.combatData?.combatState) {
          pc.clearAllActions(true);
        }
        GameState.CursorManager.selectedObject.onClick(pc);
      } else {
        let distance = GameState.getCurrentPlayer().position.distanceTo(GameState.CursorManager.selectedObject.position);
        if (distance > 1.5) {
          GameState.getCurrentPlayer().clearAllActions();
          GameState.CursorManager.selectedObject.clearAllActions();
          GameState.getCurrentPlayer().actionDialogObject(GameState.CursorManager.selectedObject);
        }
      }
    }
  }
  
}
