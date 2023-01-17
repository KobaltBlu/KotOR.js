/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { CurrentGame } from "../../../CurrentGame";
import { GameState } from "../../../GameState";
import { GUIButton, GUIControl, GUILabel, MenuManager } from "../../../gui";
import { GlobalVariableManager } from "../../../managers/GlobalVariableManager";
import { PartyManager } from "../../../managers/PartyManager";
import { CharGenQuickPanel as K1_CharGenQuickPanel } from "../../kotor/KOTOR";

/* @file
* The CharGenQuickPanel menu class.
*/

export class CharGenQuickPanel extends K1_CharGenQuickPanel {

  declare BTN_BACK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare LBL_3: GUIControl;
  declare LBL_2: GUIControl;
  declare LBL_1: GUIControl;
  declare BTN_STEPNAME1: GUIButton;
  declare LBL_NUM1: GUILabel;
  declare BTN_STEPNAME2: GUIButton;
  declare LBL_NUM2: GUILabel;
  declare BTN_STEPNAME3: GUIButton;
  declare LBL_NUM3: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'quickpnl_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
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
        GameState.player.equipment.ARMOR = undefined;
        GameState.player.template.GetFieldByLabel('Equip_ItemList').ChildStructs = [];
        GlobalVariableManager.Init();
        PartyManager.Player = GameState.player.template;
        PartyManager.AddPortraitToOrder(GameState.player.getPortraitResRef());
        CurrentGame.InitGameInProgressFolder().then( () => {
          GameState.LoadModule('001EBO');

        });
      });

      this.BTN_BACK.addEventListener('click', (e: any) => {

        e.stopPropagation();
        MenuManager.CharGenMain.Close();
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickOrCustom;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_BACK.reattach(this.tGuiPanel);

      this.RecalculatePosition();
      resolve();
    });
  }
  
}
