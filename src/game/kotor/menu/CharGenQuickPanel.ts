/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { CurrentGame } from "../../../CurrentGame";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIButton, GUIControl } from "../../../gui";
import { CharGenManager, GlobalVariableManager, MenuManager, PartyManager } from "../../../managers";

/* @file
* The CharGenQuickPanel menu class.
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
  step1: boolean;
  step2: boolean;

  constructor(){
    super();
    this.gui_resref = 'quickpnl';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.step1 = false;
      this.step2 = false;

      this.BTN_STEPNAME1.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenPortCust.Open();
      });

      this.BTN_STEPNAME2.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenName.Open();
      });

      this.BTN_STEPNAME3.addEventListener('click', (e: any) => {
        e.stopPropagation();
        CharGenManager.selectedCreature.equipment.ARMOR = undefined;
        CharGenManager.selectedCreature.template.GetFieldByLabel('Equip_ItemList').ChildStructs = [];
        GlobalVariableManager.Init();
        PartyManager.Player = CharGenManager.selectedCreature.save();
        PartyManager.AddPortraitToOrder(CharGenManager.selectedCreature.getPortraitResRef());
        CurrentGame.InitGameInProgressFolder(true).then( () => {
          GameState.LoadModule('end_m01aa');
        });
      });

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.CharGenMain.Close();
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_BACK.reattach(this.tGuiPanel);

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 85;
      this.RecalculatePosition();
      resolve();
    });
  }

  Show() {
    super.Show();
    this.BTN_STEPNAME2.hide();
    this.LBL_2.hide();
    this.LBL_NUM2.hide();
    this.BTN_STEPNAME3.hide();
    this.LBL_3.hide();
    this.LBL_NUM3.hide();
    if (this.step1) {
      this.BTN_STEPNAME2.show();
      this.LBL_2.show();
      this.LBL_NUM2.show();
    }
    if (this.step2) {
      this.BTN_STEPNAME3.show();
      this.LBL_3.show();
      this.LBL_NUM3.show();
    }
  }
  
}
