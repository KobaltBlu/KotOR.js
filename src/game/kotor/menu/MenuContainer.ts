import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIListBox, GUIButton } from "@/gui";
import { TextureLoader } from "@/loaders";
import type { ModuleCreature, ModuleItem, ModuleObject, ModulePlaceable } from "@/module";
import { MenuContainerMode } from "@/enums/gui/MenuContainerMode";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";

const STR_ITEMS_AVAILABLE = 392;
const STR_CONTAINER_INVENTORY = 393;
const STR_SWITCH_TO = 47884;
const STR_GET_ITEMS = 38542;
const STR_GIVE_ITEMS = 38543;

/**
 * MenuContainer class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuContainer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuContainer extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_MESSAGE: GUILabel;
  LB_ITEMS: GUIListBox;
  BTN_OK: GUIButton;
  BTN_GIVEITEMS: GUIButton;
  BTN_CANCEL: GUIButton;
  container: ModuleObject;
  mode: MenuContainerMode = MenuContainerMode.TAKE_ITEMS;
  selectedItem: ModuleItem;

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

      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.LB_ITEMS.clearItems();
        if(this.container instanceof GameState.Module.ModuleArea.ModulePlaceable){
          this.container.close(GameState.PartyManager.party[0]);
        }
        this.close();
      });
      this._button_b = this.BTN_CANCEL;

      this.BTN_OK.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedItem = this.selectedItem;
        if(!selectedItem){
          return;
        }
        if(this.mode == MenuContainerMode.TAKE_ITEMS){
          this.LB_ITEMS.clearItems();
          if(this.container instanceof GameState.Module.ModuleArea.ModulePlaceable){
            this.container.retrieveInventory();
            this.container.close(GameState.PartyManager.party[0]);
          }else if(this.container instanceof GameState.Module.ModuleArea.ModuleCreature){
            this.container.retrieveInventory();
            //this.container.close(Game.player);
          }
          this.close();
        }else{
          if(selectedItem.getStackSize() <= 0){
            return;
          }
          const willRemoveFromInventory = selectedItem.getStackSize() <= 1;
          GameState.InventoryManager.removeItem(selectedItem, 1);
          const newItem = selectedItem.clone();
          newItem.setStackSize(1);
          this.container.addItem(newItem);
          if(willRemoveFromInventory){
            this.LB_ITEMS.removeItemByNode(selectedItem);
            return;
          }
          const control = this.LB_ITEMS.getListElementByNode(selectedItem);
          if(control){
            control.needsUpdate = true;
          }
        }
      });
      this._button_a = this.BTN_OK;

      this.BTN_GIVEITEMS.addEventListener('click', (e) => {
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
        this.selectedItem = item;
      }

      resolve();
    });
  }

  hide(onClosed = false) {
    super.hide();
    if (onClosed && this.container instanceof GameState.Module.ModuleArea.ModulePlaceable) {
      try {
        this.container.close(GameState.getCurrentPlayer());
      } catch (e: unknown) {

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

  getSelectedContainer(){
    return this.mode == MenuContainerMode.TAKE_ITEMS ? this.container : GameState.InventoryManager;
  }

  setMode(mode: MenuContainerMode){
    this.mode = mode;
    this.selectedItem = null;
    switch(this.mode){
      case MenuContainerMode.TAKE_ITEMS:
        this.LBL_MESSAGE.setText(GameState.TLKManager.GetStringById(STR_CONTAINER_INVENTORY).Value);
        this.BTN_OK.setText(GameState.TLKManager.GetStringById(STR_GET_ITEMS).Value);
        this.BTN_GIVEITEMS.setText(
          GameState.TLKManager.GetStringById(STR_SWITCH_TO).Value + ' ' +
          GameState.TLKManager.GetStringById(STR_GIVE_ITEMS).Value
        )
      break;
      case MenuContainerMode.GIVE_ITEMS:
        this.LBL_MESSAGE.setText(GameState.TLKManager.GetStringById(STR_ITEMS_AVAILABLE).Value);
        this.BTN_OK.setText(GameState.TLKManager.GetStringById(STR_GIVE_ITEMS).Value);
        this.BTN_GIVEITEMS.setText(
          GameState.TLKManager.GetStringById(STR_SWITCH_TO).Value + ' ' +
          GameState.TLKManager.GetStringById(STR_GET_ITEMS).Value
        )
      break;
    }

    //Update list items
    this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
    this.LB_ITEMS.clearItems();
    if (typeof this.getSelectedContainer()?.inventory === 'object') {
      const inventory = this.getSelectedContainer().inventory;
      for (let i = 0; i < inventory.length; i++) {
        const item = inventory[i];
        this.LB_ITEMS.addItem(item);
        if(!this.selectedItem){
          this.selectedItem = item;
        }
      }
      TextureLoader.LoadQueue();
      this.LB_ITEMS.selectItem(this.selectedItem);
    }

  }
  
}
