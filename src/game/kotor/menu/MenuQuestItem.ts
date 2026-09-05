import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import { ModuleItem } from "@/module/ModuleItem";
import {
  InventoryFilter,
  checkInventoryFilter,
  type InventoryListNode,
  unwrapInventoryListNode,
} from "@/game/inventory-menu-utils";

/**
 * MenuQuestItem — retail (`questitem`).
 *
 * Journal BTN_QUESTITEMS → AddPanel + PushModalPanel @ HandleInputEvent case 0x29
 * (flags=3). Overlay so the journal panel stays drawn underneath.
 * PopulateItemListBox: player bag items with plot flag.
 *
 * @file MenuQuestItem.ts
 */
export class MenuQuestItem extends GameMenu {

  LB_ITEM_DESCRIPTION: GUIListBox;
  LB_ITEMS: GUIListBox;
  LBL_TITLE: GUILabel;
  BTN_BACK: GUIButton;

  selected: InventoryListNode | undefined;

  constructor(){
    super();
    this.gui_resref = 'questitem';
    this.background = '';
    this.voidFill = false;
    // Retail AddPanel(flags=3) → PushModalPanel; journal remains in the panel list.
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_BACK?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.LB_ITEMS?.setProtoBuilder?.(GUIInventoryItem);
      if(this.LB_ITEMS){
        this.LB_ITEMS.onSelected = (item: InventoryListNode) => {
          this.selected = item;
          this.UpdateSelected();
        };
      }

      resolve();
    });
  }

  /**
   * Retail PopulateItemListBox — bag items where plot != 0.
   * Equipped plot items are omitted (repository type 1 only).
   */
  populateItemListBox(){
    const pc = GameState.PartyManager?.party?.[0];
    const bag = GameState.InventoryManager?.getInventory?.() || [];
    const nodes: ModuleItem[] = [];
    for(let i = 0; i < bag.length; i++){
      const item = bag[i];
      if(!item) continue;
      if(!checkInventoryFilter(item, pc, InventoryFilter.QUEST, false)) continue;
      nodes.push(item);
    }

    this.LB_ITEMS?.setItems(nodes, {
      selectIndex: nodes.length ? 0 : -1,
    });

    if(!nodes.length){
      this.selected = undefined;
      this.LB_ITEM_DESCRIPTION?.setItem('');
    }else{
      this.selected = (this.LB_ITEMS?.children?.[0]?.node ?? nodes[0]) as InventoryListNode;
      this.UpdateSelected();
    }
  }

  /** Retail OnControlEntered — item property description. */
  UpdateSelected(){
    const item = unwrapInventoryListNode(this.selected);
    if(item instanceof ModuleItem){
      this.LB_ITEM_DESCRIPTION?.setItem(item.getPropertyDescription());
    }else{
      this.LB_ITEM_DESCRIPTION?.setItem('');
    }
  }

  show(){
    super.show();
    this.populateItemListBox();
  }
}
