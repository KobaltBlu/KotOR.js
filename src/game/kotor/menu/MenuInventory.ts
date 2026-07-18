import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { ModuleItem } from "@/module";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import { GameState } from "@/GameState";
import {
  clearInventoryItemNewFlag,
  collectInventoryListNodes,
  cycleK1InventoryFilter,
  formatInventoryTitle,
  formatQuestItemsButtonText,
  getCurrentInventoryFilter,
  getK1InventoryFilter,
  setCurrentInventoryFilter,
  type InventoryListNode,
  unwrapInventoryListNode,
} from "@/game/inventory-menu-utils";

/**
 * MenuInventory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuInventory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  selected: InventoryListNode | undefined;
  /** Retail activating_item_id — refresh selection after InstantUseItem. */
  protected activatingItem: ModuleItem | undefined;
  protected activatedScroll: number = 0;
  protected activatedIndex: number = -1;
  /** True for TSL inventory_p (no portrait / party-change chrome). */
  protected isK2Inventory: boolean = false;

  constructor(){
    super();
    this.gui_resref = 'inventory';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;

      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.onSelected = (item: InventoryListNode) => {
        this.selected = item;
        this.UpdateSelected();
      }

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;

      this.BTN_CHANGE1?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.party.length > 0){
          GameState.PartyManager.SwitchLeaderAtIndex(1);
          this.populateItemListBox();
        }
      });
      this.BTN_CHANGE2?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.party.length > 1){
          GameState.PartyManager.SwitchLeaderAtIndex(2);
          this.populateItemListBox();
        }
      });

      this.BTN_USEITEM?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.useSelectedItem();
      });

      // Retail BTN_QUESTITEMS → SetNextFilter (X button cycles K1 filters 0–5).
      this.BTN_QUESTITEMS?.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleK1InventoryFilter();
        this.updateFilterLabels();
        this.populateItemListBox();
      });

      GameState.PartyManager.AddEventListener('change', () => {
        if(!this.isVisible()) return;
        this.updateCharacterStats();
        this.updatePartyMemberButtons();
        this.populateItemListBox();
      });
      resolve();
    });
  }

  protected getActiveCreature(){
    return GameState.PartyManager.party[0];
  }

  protected updateFilterLabels(){
    // K1 only understands filters 0–5; clamp if returning from a K2 category.
    const filter = getK1InventoryFilter(getCurrentInventoryFilter());
    if(filter !== getCurrentInventoryFilter()){
      setCurrentInventoryFilter(filter);
    }
    this.LBL_INV?.setText(formatInventoryTitle(filter));
    this.BTN_QUESTITEMS?.setText(formatQuestItemsButtonText(filter));
  }

  /**
   * Retail PopulateItemListBox — equipped slots then bag, CheckFilter applied.
   */
  populateItemListBox(preserveSelection: boolean = false){
    const pc = this.getActiveCreature();
    if(!pc){
      this.LB_ITEMS.setItems([]);
      this.selected = undefined;
      this.UpdateSelected();
      return;
    }

    const filter = getCurrentInventoryFilter();
    const nodes = collectInventoryListNodes(pc, filter, this.isK2Inventory);

    let selectIndex = 0;
    if(preserveSelection && this.activatingItem){
      const idx = nodes.findIndex((n) => unwrapInventoryListNode(n) === this.activatingItem);
      if(idx >= 0) selectIndex = idx;
      else if(this.activatedIndex >= 0){
        selectIndex = Math.min(this.activatedIndex, Math.max(0, nodes.length - 1));
      }
    }else if(this.selected){
      const selectedItem = unwrapInventoryListNode(this.selected);
      const idx = nodes.findIndex((n) => unwrapInventoryListNode(n) === selectedItem);
      if(idx >= 0) selectIndex = idx;
    }

    const savedScroll = preserveSelection ? this.activatedScroll : this.LB_ITEMS.scroll;

    this.LB_ITEMS.setItems(nodes, {
      selectIndex: nodes.length ? selectIndex : -1,
    });

    if(nodes.length && typeof savedScroll === 'number'){
      this.LB_ITEMS.scroll = savedScroll;
      this.LB_ITEMS.updateList?.();
    }

    if(!nodes.length){
      this.selected = undefined;
      this.LB_DESCRIPTION?.setItem('');
      if(this.BTN_USEITEM){
        this.BTN_USEITEM.disableSelection = true;
      }
    }else{
      const selectedCtrl = this.LB_ITEMS.children[selectIndex];
      this.selected = (selectedCtrl?.node ?? nodes[selectIndex]) as InventoryListNode;
      this.UpdateSelected();
    }

    this.activatingItem = undefined;
    this.LBL_CREDITS_VALUE?.setText(String(GameState.PartyManager.Gold));
  }

  /** @deprecated use populateItemListBox — kept for subclasses that call filterInventory. */
  filterInventory(){
    this.populateItemListBox();
  }

  canUseSelectedItem(): boolean {
    if(!this.selected) return false;
    return (this.selected.inventoryCanUse | 0) === 1;
  }

  useSelectedItem(){
    const pc = this.getActiveCreature();
    const item = unwrapInventoryListNode(this.selected);
    if(!pc || !item) return;

    if(!this.canUseSelectedItem()){
      const strRef = this.selected.inventoryDenyStrRef | 0;
      if(strRef){
        GameState.FeedbackMessageManager?.AddStrRef?.(strRef);
      }
      return;
    }

    // Retail OnControlSelected: InstantUseItem, keep panel open, dirty-refresh list.
    this.activatingItem = item;
    this.activatedScroll = this.LB_ITEMS.scroll | 0;
    this.activatedIndex = this.LB_ITEMS.listItems?.indexOf(this.selected) ?? -1;

    GameState.ActionMenuManager.SetPC(pc);
    GameState.ActionMenuManager.useInventoryItem(item, pc);

    this.populateItemListBox(true);
    this.updateCharacterStats();
  }

  UpdateSelected(){
    const item = unwrapInventoryListNode(this.selected);
    if(item instanceof ModuleItem){
      this.LB_DESCRIPTION?.setItem(item.getDescription());
      clearInventoryItemNewFlag(item);
    }else{
      this.LB_DESCRIPTION?.setItem('');
    }
    if(this.BTN_USEITEM){
      this.BTN_USEITEM.disableSelection = !this.canUseSelectedItem();
    }
  }

  updateCharacterStats(){
    if(this.isK2Inventory) return;
    const currentPC = this.getActiveCreature();
    if (!currentPC) {
      return;
    }
    this.LBL_VIT?.setText(currentPC.getHP() + '/' + currentPC.getMaxHP());
    this.LBL_DEF?.setText(currentPC.getAC());
    if(this.LBL_PORT && this.LBL_PORT.getFillTextureName() != currentPC.getPortraitResRef()){
      this.LBL_PORT.setFillTextureName(currentPC.getPortraitResRef());
    }
    this.LBL_CREDITS_VALUE?.setText(String(GameState.PartyManager.Gold));
  }

  updatePartyMemberButtons(){
    if(this.isK2Inventory) return;
    this.BTN_CHANGE1?.hide();
    this.BTN_CHANGE2?.hide();
    for (let i = 0; i < GameState.PartyManager.party.length; i++) {
      if (i == 0) { continue; }

      const btn_change = this.getControlByName('BTN_CHANGE' + i);
      if(!btn_change){ continue; }

      const partyMember = GameState.PartyManager.party[i];
      if(!partyMember){ continue; }

      const portraitResRef = partyMember.getPortraitResRef();
      btn_change.show();
      if (btn_change.getFillTextureName() != portraitResRef) {
        btn_change.setFillTextureName(portraitResRef);
      }
    }
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_INV.onHoverIn();
    this.selectedControl = this.LB_ITEMS;
    this.updateFilterLabels();
    this.populateItemListBox();
    this.updateCharacterStats();
    this.updatePartyMemberButtons();
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_EQU.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_CHAR.click();
  }
  
}
