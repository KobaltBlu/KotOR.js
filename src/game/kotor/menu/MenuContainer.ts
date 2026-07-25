import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { GameMenu, GUILabel, GUIListBox, GUIButton } from "@/gui";
import type { ModuleItem, ModuleObject } from "@/module";
import { MenuContainerMode } from "@/enums/gui/MenuContainerMode";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import { Mouse } from "@/controls/Mouse";

/** TLK: "Items Available to Place in Container" */
const STR_ITEMS_AVAILABLE = 392;
/** TLK: "Container Inventory" */
const STR_CONTAINER_INVENTORY = 393;
/** TLK: "Container is Empty" */
const STR_CONTAINER_EMPTY = 394;
/** TLK K2: "Target's Inventory is empty" */
const STR_TARGET_INVENTORY_EMPTY = 119906;
/** TLK: "Switch To" */
const STR_SWITCH_TO = 47884;
/** TLK: "Get Items" */
const STR_GET_ITEMS = 38542;
/** TLK: K1 "Give Item" / K2 "Give Items" */
const STR_GIVE_ITEMS = 38543;

/**
 * MenuContainer class.
 *
 * Retail CSWGuiContainer — take-all from container inventory, or give
 * non-plot items into the container (click item / OK in give mode).
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
  /** Present on K2 container_p; mirrors BTN_OK caption. */
  LBL_OK: GUILabel;
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
    return new Promise<void>((resolve) => {

      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeContainerObject();
        this.close();
      });
      this._button_b = this.BTN_CANCEL;

      this.BTN_OK.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.mode == MenuContainerMode.TAKE_ITEMS){
          this.takeAllItems();
        }else{
          this.giveItem(this.selectedItem);
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
      };

      // Retail: list-item activate (0x27/0x2d) calls CSWGuiContainer::GiveItem
      this.LB_ITEMS.onClicked = (item: ModuleItem) => {
        this.selectedItem = item;
        if(this.mode == MenuContainerMode.GIVE_ITEMS){
          this.giveItem(item);
        }
      };

      // K1 container.gui parks the dialog at design-canvas (164,68) ≈ centered on
      // 640×480. KotOR.js centers by panel size at widget (0,0); keep that visual
      // and zero the GFF origin so GetLocalMouseCoords / hit tests match (same
      // pattern as InGameConfirm). Leaving LEFT/TOP=164/68 made hitboxes drift.
      this.tGuiPanel.extent.left = 0;
      this.tGuiPanel.extent.top = 0;

      resolve();
    });
  }

  hide() {
    super.hide();
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

  /** Inventory list for the active mode (give mode excludes plot items). */
  getModeInventory(): ModuleItem[] {
    if(this.mode == MenuContainerMode.TAKE_ITEMS){
      const inv = this.container?.inventory;
      return Array.isArray(inv) ? inv : [];
    }
    return GameState.InventoryManager.getNonQuestInventory();
  }

  setMode(mode: MenuContainerMode){
    this.mode = mode;
    this.selectedItem = null;
    const switchTo = GameState.TLKManager.GetStringById(STR_SWITCH_TO).Value;
    switch(this.mode){
      case MenuContainerMode.TAKE_ITEMS:
        this.LBL_MESSAGE.setText(this.getTakeModeMessage());
        this.setOkCaption(GameState.TLKManager.GetStringById(STR_GET_ITEMS).Value);
        this.BTN_GIVEITEMS.setText(
          switchTo + ' ' + GameState.TLKManager.GetStringById(STR_GIVE_ITEMS).Value
        );
        break;
      case MenuContainerMode.GIVE_ITEMS:
        this.LBL_MESSAGE.setText(GameState.TLKManager.GetStringById(STR_ITEMS_AVAILABLE).Value);
        this.setOkCaption(GameState.TLKManager.GetStringById(STR_GIVE_ITEMS).Value);
        this.BTN_GIVEITEMS.setText(
          switchTo + ' ' + GameState.TLKManager.GetStringById(STR_GET_ITEMS).Value
        );
        break;
    }

    this.refreshItemList(false);
  }

  /** Retail SetContainer message selection for take mode. */
  getTakeModeMessage(): string {
    const inventory = this.container?.inventory;
    const empty = !Array.isArray(inventory) || inventory.length === 0;
    if(empty){
      if(
        GameState.GameKey == GameEngineType.TSL &&
        this.container instanceof GameState.Module.ModuleArea.ModuleCreature
      ){
        return GameState.TLKManager.GetStringById(STR_TARGET_INVENTORY_EMPTY).Value;
      }
      return GameState.TLKManager.GetStringById(STR_CONTAINER_EMPTY).Value;
    }
    return GameState.TLKManager.GetStringById(STR_CONTAINER_INVENTORY).Value;
  }

  setOkCaption(text: string){
    this.BTN_OK.setText(text);
    // K2 container_p mirrors the OK caption on LBL_OK
    this.LBL_OK?.setText?.(text);
  }

  refreshItemList(preserveSelection: boolean){
    const previous = preserveSelection ? this.selectedItem : null;
    this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
    const inventory = this.getModeInventory();
    if(previous && inventory.indexOf(previous) >= 0){
      this.selectedItem = previous;
    }else if(inventory.length > 0){
      this.selectedItem = inventory[0];
    }else{
      this.selectedItem = null;
    }
    // Prefer setSelectedIndex over setItems(selectIndex) — select() fires onClicked
    // and would re-enter giveItem while refreshing the give-mode list.
    this.LB_ITEMS.setItems(inventory);
    if(this.selectedItem){
      const idx = inventory.indexOf(this.selectedItem);
      if(idx >= 0){
        this.LB_ITEMS.setSelectedIndex(idx);
      }
    }
  }

  /** Retail HandleInputEvent OK in take mode — loot all and close. */
  takeAllItems(){
    this.LB_ITEMS.setItems([]);
    if(this.container instanceof GameState.Module.ModuleArea.ModulePlaceable){
      this.container.retrieveInventory();
      this.container.close(GameState.PartyManager.party[0]);
    }else if(this.container instanceof GameState.Module.ModuleArea.ModuleCreature){
      this.container.retrieveInventory();
    }
    this.close();
  }

  /**
   * Retail CSWGuiContainer::GiveItem — move count from party inventory into
   * the container. Shift holds the full stack (g_bShiftActionState).
   */
  giveItem(item: ModuleItem){
    if(this.mode != MenuContainerMode.GIVE_ITEMS || !item || !this.container){
      return;
    }
    const stack = item.getStackSize() | 0;
    if(stack <= 0){
      return;
    }
    const count = Mouse.shiftKey ? stack : 1;
    GameState.InventoryManager.removeItem(item, count);
    const donated = item.clone();
    donated.setStackSize(count);
    this.container.addItem(donated);
    // Retail Update bit flags → SetupGiveMode(1) refresh
    this.refreshItemList(true);
  }

  closeContainerObject(){
    this.LB_ITEMS.setItems([]);
    if(this.container instanceof GameState.Module.ModuleArea.ModulePlaceable){
      this.container.close(GameState.PartyManager.party[0]);
    }
  }

}
