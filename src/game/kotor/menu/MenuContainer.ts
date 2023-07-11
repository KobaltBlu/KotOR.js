/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { ModuleCreature, ModuleItem, ModuleObject, ModulePlaceable } from "../../../module";
import { MenuContainerMode } from "../../../enums/gui/MenuContainerMode";
import { TLKManager } from "../../../managers";
import { GUIInventoryItem } from "../../../gui/protoitem/GUIInventoryItem";

/* @file
* The MenuContainer menu class.
*/

const STR_SWITCH_TO = 47884;
const STR_GET_ITEMS = 38542;
const STR_GIVE_ITEMS = 38543;

export class MenuContainer extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_MESSAGE: GUILabel;
  LB_ITEMS: GUIListBox;
  BTN_OK: GUIButton;
  BTN_GIVEITEMS: GUIButton;
  BTN_CANCEL: GUIButton;
  container: ModuleObject;
  mode: MenuContainerMode = MenuContainerMode.TAKE_ITEMS;

  constructor(){
    super();
    this.gui_resref = 'container';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_CANCEL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.LB_ITEMS.clearItems();
        if(this.container instanceof ModulePlaceable){
          this.container.close(GameState.player);
        }
        this.close();
      });
      this._button_b = this.BTN_CANCEL;

      this.BTN_OK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(this.mode == MenuContainerMode.TAKE_ITEMS){
          this.LB_ITEMS.clearItems();
          if(this.container instanceof ModulePlaceable){
            this.container.retrieveInventory();
            this.container.close(GameState.player);
          }else if(this.container instanceof ModuleCreature){
            this.container.retrieveInventory();
            //this.container.close(Game.player);
          }
          this.close();
        }else{

        }
      });
      this._button_a = this.BTN_OK;

      this.BTN_GIVEITEMS.addEventListener('click', (e: any) => {
        e.stopPropagation();

        switch(this.mode){
          case MenuContainerMode.TAKE_ITEMS:
            this.setMode(MenuContainerMode.GIVE_ITEMS);
          break;
          case MenuContainerMode.GIVE_ITEMS:
            this.setMode(MenuContainerMode.TAKE_ITEMS);
          break;
        }
      });
      this._button_x = this.BTN_GIVEITEMS;

      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        if(this.mode == MenuContainerMode.TAKE_ITEMS){

        }else{
          
        }
      }

      resolve();
    });
  }

  hide(onClosed = false) {
    super.hide();
    if (onClosed && this.container instanceof ModulePlaceable) {
      try {
        this.container.close(GameState.getCurrentPlayer());
      } catch (e: any) {

      }
    }
  }

  AttachContainer(object: ModuleObject){
    this.container = object;
  }

  open() {
    super.open();
  }

  show() {
    super.show();
    this.setMode(MenuContainerMode.TAKE_ITEMS);
  }

  setMode(mode: MenuContainerMode){
    this.mode = mode;

    switch(this.mode){
      case MenuContainerMode.TAKE_ITEMS:
        this.BTN_OK.setText(TLKManager.GetStringById(STR_GET_ITEMS).Value);
        this.BTN_GIVEITEMS.setText(
          TLKManager.GetStringById(STR_SWITCH_TO).Value + ' ' +
          TLKManager.GetStringById(STR_GIVE_ITEMS).Value
        )
      break;
      case MenuContainerMode.GIVE_ITEMS:
        this.BTN_OK.setText(TLKManager.GetStringById(STR_GIVE_ITEMS).Value);
        this.BTN_GIVEITEMS.setText(
          TLKManager.GetStringById(STR_SWITCH_TO).Value + ' ' +
          TLKManager.GetStringById(STR_GET_ITEMS).Value
        )
      break;
    }

    //Update list items
    this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
    this.LB_ITEMS.clearItems();
    if (this.container instanceof ModuleCreature || this.container instanceof ModulePlaceable) {
      let inventory = this.container.getInventory();
      for (let i = 0; i < inventory.length; i++) {
        let item = inventory[i];
        this.LB_ITEMS.addItem(item, null);
      }
      TextureLoader.LoadQueue();
    }

  }
  
}
