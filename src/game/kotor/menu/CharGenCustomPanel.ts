/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { CurrentGame } from "../../../CurrentGame";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIControl, GUIButton } from "../../../gui";
import { CharGenManager, GlobalVariableManager, MenuManager, PartyManager } from "../../../managers";

/* @file
* The CharGenCustomPanel menu class.
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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenMain.Close();
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_STEPNAME1.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenPortCust.Open();
      });

      this.BTN_STEPNAME2.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenAbilities.Open();
      });

      this.BTN_STEPNAME3.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenSkills.Open();
      });

      this.BTN_STEPNAME4.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenFeats.Open();
      });

      this.BTN_STEPNAME5.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenName.Open();
      });

      this.BTN_STEPNAME6.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedCreature.equipment.ARMOR = undefined;
        CharGenManager.selectedCreature.template.GetFieldByLabel('Equip_ItemList').ChildStructs = [];
        GlobalVariableManager.Init();
        PartyManager.PlayerTemplate = CharGenManager.selectedCreature.save();
        PartyManager.AddPortraitToOrder(CharGenManager.selectedCreature.getPortraitResRef());
        CurrentGame.InitGameInProgressFolder(true).then( () => {
          GameState.LoadModule('end_m01aa');
        });
      });

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 85;
      this.RecalculatePosition();
      resolve();
    });
  }
  
}
