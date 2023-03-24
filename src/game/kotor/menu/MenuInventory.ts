/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUIListBox, GUILabel, GUIButton, GUIControl, GUIProtoItem, MenuManager } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { InventoryManager } from "../../../managers/InventoryManager";
import { PartyManager } from "../../../managers/PartyManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { GFFStruct } from "../../../resource/GFFStruct";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import * as THREE from "three";
import { TextureType } from "../../../enums/loaders/TextureType";
import { ModuleItem } from "../../../module";
import { GameEngineType } from "../../../KotOR";
import { GUIInventoryItem } from "../../../gui/protoitem/GUIInventoryItem";

/* @file
* The MenuInventory menu class.
*/

export class MenuInventory extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_INV: GUILabel;
  LBL_CREDITS_VALUE: GUILabel;
  LBL_CREDITS: GUILabel;
  LB_DESCRIPTION: GUIListBox;
  LBL_BGPORT: GUILabel;
  LBL_BGSTATS: GUILabel;
  LBL_PORT: GUILabel;
  LBL_VIT: GUILabel;
  LBL_DEF: GUILabel;
  BTN_QUESTITEMS: GUIButton;
  BTN_CHANGE1: GUIButton;
  BTN_CHANGE2: GUIButton;
  BTN_USEITEM: GUIButton;
  BTN_EXIT: GUIButton;

  selected: ModuleItem;

  constructor(){
    super();
    this.gui_resref = 'inventory';
    this.background = '1600x1200back';
    this.voidFill = true;
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      this._button_b = this.BTN_EXIT;

      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        this.selected = item;
        this.UpdateSelected();
      }

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;
      resolve();
    });
  }

  UpdateSelected(){
    if(this.selected instanceof ModuleItem){
      this.LB_DESCRIPTION?.clearItems();
      this.LB_DESCRIPTION?.addItem(this.selected.getDescription());
    }
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_INV.onHoverIn();
    this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
    this.LB_ITEMS.clearItems();
    let inv = InventoryManager.getNonQuestInventory();
    for (let i = 0; i < inv.length; i++) {
      this.LB_ITEMS.addItem(inv[i]);
    }
    TextureLoader.LoadQueue();
    this.BTN_CHANGE1?.hide();
    this.BTN_CHANGE2?.hide();
    let currentPC = PartyManager.party[0];
    if (currentPC) {
      this.LBL_VIT?.setText(currentPC.getHP() + '/' + currentPC.getMaxHP());
      this.LBL_DEF?.setText(currentPC.getAC());
    }
    this.LBL_CREDITS_VALUE.setText(PartyManager.Gold);

    let btn_change: GUIControl;
    for (let i = 0; i < PartyManager.party.length; i++) {
      btn_change = this.getControlByName('BTN_CHANGE' + i);
      if(btn_change){
        let partyMember = PartyManager.party[i];
        let portraitId = partyMember.getPortraitId();
        let portrait = TwoDAManager.datatables.get('portraits').rows[portraitId];
        if (!i) {
          if (this.LBL_PORT.getFillTextureName() != portrait.baseresref) {
            this.LBL_PORT.setFillTextureName(portrait.baseresref);
          }
        } else {
          btn_change.show();
          if (btn_change.getFillTextureName() != portrait.baseresref) {
            btn_change.setFillTextureName(portrait.baseresref);
          }
        }
      }
    }
  }

  triggerControllerBumperLPress() {
    MenuManager.MenuTop.BTN_EQU.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_CHAR.click();
  }
  
}

