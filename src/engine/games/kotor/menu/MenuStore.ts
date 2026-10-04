import { GameState } from "@engine/runtime/GameState";
import { GameEngineType } from "@core/enums/engine/GameEngineType";
import { ModuleCreatureArmorSlot } from "@core/enums/module/ModuleCreatureArmorSlot";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import { GUIInventoryItem } from "@engine/gui/protoitem/GUIInventoryItem";
import type { ModuleCreature, } from "@engine/module/ModuleCreature";
import type { ModuleItem } from "@engine/module/ModuleItem";
import type { ModuleStore } from "@engine/module/ModuleStore";

import { isItem } from "@engine/module/guards/isItem";
import { isStore } from "@engine/module/guards/isStore";

/** CheckFilter modes (store_p filter buttons). */
export enum StoreFilter {
  ALL = 0,
  WEAPONS = 1,
  ARMOR = 2,
  MISC = 3,
}

/** BuySellFlag (+ InitializeStoreType). */
export enum StoreBuySellFlag {
  BUY_ONLY = 1,
  SELL_ONLY = 2,
  BUY_AND_SELL = 3,
}

const TLK_CANT_AFFORD = 41950;
const TLK_INFINITE = 41951;
const TLK_CONFIRM_SELL = 41985;
const TLK_CONFIRM_BUY = 42020;

/** Armor / wearable slots used by CheckFilter case 2 (0x78b). */
const STORE_ARMOR_SLOTS =
  ModuleCreatureArmorSlot.HEAD |
  ModuleCreatureArmorSlot.ARMOR |
  ModuleCreatureArmorSlot.ARMS |
  ModuleCreatureArmorSlot.LEFTARMBAND |
  ModuleCreatureArmorSlot.RIGHTARMBAND |
  ModuleCreatureArmorSlot.IMPLANT |
  ModuleCreatureArmorSlot.BELT;

/**
 * MenuStore class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuStore.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuStore extends GameMenu {

  LB_INVITEMS: GUIListBox;
  LB_DESCRIPTION: GUIListBox;
  LB_SHOPITEMS: GUIListBox;
  LBL_BUYSELL: GUILabel;
  LBL_CREDITS_VALUE: GUILabel;
  LBL_CREDITS: GUILabel;
  LBL_COST_VALUE: GUILabel;
  LBL_COST: GUILabel;
  LBL_STOCK: GUILabel;
  LBL_STOCK_VALUE: GUILabel;
  BTN_Examine: GUIButton;
  BTN_Cancel: GUIButton;
  BTN_Accept: GUIButton;
  storeObject: ModuleStore;
  creature: ModuleCreature;
  bonusMarkUp: number = 0;
  bonusMarkDown: number = 0;
  sellMode: boolean = false;
  filter: StoreFilter = StoreFilter.ALL;

  constructor(){
    super();
    this.gui_resref = 'store';
    this.background = '1600x1200store';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LB_SHOPITEMS?.setProtoBuilder?.(GUIInventoryItem);
      this.LB_INVITEMS?.setProtoBuilder?.(GUIInventoryItem);

      this.BTN_Cancel?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_Examine?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.getBuySellFlag() !== StoreBuySellFlag.BUY_AND_SELL){
          return;
        }
        this.sellMode = !this.sellMode;
        this.show();
      });

      this.BTN_Accept?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAccept();
      });

      this._button_b = this.BTN_Cancel;
      this._button_a = this.BTN_Accept;
      resolve();
    });
  }

  /** Clamp bonus like ExecuteCommandOpenStore (−100..100). */
  static clampBonus(value: number): number {
    const n = value | 0;
    if(n > 100) return 100;
    if(n < -100) return -100;
    return n;
  }

  getBuySellFlag(): number {
    const flag = this.storeObject?.buySellFlag ?? StoreBuySellFlag.BUY_AND_SELL;
    if(flag === StoreBuySellFlag.BUY_ONLY || flag === StoreBuySellFlag.SELL_ONLY || flag === StoreBuySellFlag.BUY_AND_SELL){
      return flag;
    }
    return StoreBuySellFlag.BUY_AND_SELL;
  }

  /**
   * CheckFilter — equipableSlots masks.
   * WEAPONS: 0x30 (RIGHTHAND|LEFTHAND); ARMOR: 0x78b; MISC: no slots.
   */
  checkFilter(item: ModuleItem): boolean {
    if(!item){
      return false;
    }
    const slots = item.baseItem?.equipableSlots ?? 0;
    switch(this.filter){
      case StoreFilter.WEAPONS:
        return (slots & (ModuleCreatureArmorSlot.RIGHTHAND | ModuleCreatureArmorSlot.LEFTHAND)) !== 0;
      case StoreFilter.ARMOR:
        return (slots & STORE_ARMOR_SLOTS) !== 0;
      case StoreFilter.MISC:
        return slots === 0;
      case StoreFilter.ALL:
      default:
        return true;
    }
  }

  sortStoreItems(items: ModuleItem[]): ModuleItem[] {
    return items.slice().sort((a, b) => {
      const sa = a.baseItem?.storePanelSort ?? 0;
      const sb = b.baseItem?.storePanelSort ?? 0;
      if(sa !== sb) return sa - sb;
      return 0;
    });
  }

  /** Player pays: (MarkUp + bonusMarkUp) * GetCost / 100 */
  getItemBuyPrice(item: ModuleItem) {
    const markUp = (this.storeObject?.markUp ?? 0) + (this.bonusMarkUp | 0);
    return Math.max(0, Math.floor(markUp * item.getGoldPieceValue() / 100));
  }

  /** Player receives: (MarkDown + bonusMarkDown) * GetCost / 100 */
  getItemSellPrice(item: ModuleItem) {
    const markDown = (this.storeObject?.markDown ?? 0) + (this.bonusMarkDown | 0);
    return Math.max(0, Math.floor(markDown * item.getGoldPieceValue() / 100));
  }

  setStoreObject(storeObject: ModuleStore){
    this.storeObject = storeObject;
  }

  setCustomerObject(creature: ModuleCreature){
    this.creature = creature;
  }

  setBonusMarkUp(bonusMarkUp: number = 0){
    this.bonusMarkUp = MenuStore.clampBonus(bonusMarkUp);
  }

  setBonusMarkDown(bonusMarkDown: number = 0){
    this.bonusMarkDown = MenuStore.clampBonus(bonusMarkDown);
  }

  /**
   * InitializeStoreType — BuySellFlag drives buy/sell and Examine visibility.
   */
  initializeStoreType(){
    const flag = this.getBuySellFlag();
    if(flag === StoreBuySellFlag.SELL_ONLY){
      this.sellMode = true;
      this.BTN_Examine?.hide();
    }else if(flag === StoreBuySellFlag.BUY_ONLY){
      this.sellMode = false;
      this.BTN_Examine?.hide();
    }else{
      this.sellMode = false;
      this.BTN_Examine?.show();
    }
  }

  open(){
    this.initializeStoreType();
    super.open();
  }

  /** expensive threshold: GetSkillRank(0)*50; sell capped at 250. */
  getExpensiveThreshold(forSell: boolean): number {
    const pc = this.creature || GameState.PartyManager.party[0];
    if(!pc){
      return forSell ? 250 : 50;
    }
    const threshold = ((pc.getSkillLevel(0) | 0) & 0xff) * 50;
    if(forSell){
      return threshold > 250 ? 250 : threshold;
    }
    return threshold;
  }

  countPartyOnHand(item: ModuleItem): number {
    const tag = (item.getTag?.() || '').toLowerCase();
    if(!tag) return 0;
    let count = 0;
    const inv = GameState.InventoryManager.getInventory();
    for(let i = 0; i < inv.length; i++){
      const invItem = inv[i];
      if((invItem.getTag?.() || '').toLowerCase() === tag){
        count += invItem.getStackSize?.() || 1;
      }
    }
    const party = GameState.PartyManager.party || [];
    for(let p = 0; p < Math.min(3, party.length); p++){
      const member = party[p];
      if(!member?.equipment) continue;
      const eq = member.equipment as Record<string, ModuleItem | undefined>;
      for(const key of Object.keys(eq)){
        const equipped = eq[key];
        if(equipped && (equipped.getTag?.() || '').toLowerCase() === tag){
          count += equipped.getStackSize?.() || 1;
        }
      }
    }
    return count;
  }

  countStoreStock(item: ModuleItem): number {
    const tag = (item.getTag?.() || '').toLowerCase();
    if(!tag || !this.storeObject) return 0;
    let count = 0;
    const inv = this.storeObject.getInventory();
    for(let i = 0; i < inv.length; i++){
      const storeItem = inv[i];
      if(storeItem.isInfinite?.()){
        if((storeItem.getTag?.() || '').toLowerCase() === tag){
          return -1;
        }
        continue;
      }
      if((storeItem.getTag?.() || '').toLowerCase() === tag){
        count += storeItem.getStackSize?.() || 1;
      }
    }
    return count;
  }

  setStockValueText(count: number, infinite: boolean = false){
    if(count < 0 || infinite){
      this.LBL_STOCK_VALUE?.setText(GameState.TLKManager.GetStringById(TLK_INFINITE).Value);
    }else{
      this.LBL_STOCK_VALUE?.setText(String(count));
    }
  }

  /**
   * OnControlEntered stock / on-hand labels.
   * K1: LBL_STOCK_VALUE is always the selected item's stack (or Infinite on that item).
   * K2 buy: STOCK = store item stack/Infinite; ONHAND = party matching count.
   * K2 sell: STOCK = store matching count; ONHAND = party possession of selected item.
   */
  updateSelectedItemLabels(item: ModuleItem | null | undefined){
    if(!item){
      this.LBL_COST_VALUE?.setText('');
      this.LBL_STOCK_VALUE?.setText('');
      this.setOnHandValue('');
      return;
    }

    const isTSL = GameState.GameKey == GameEngineType.TSL;

    if(this.sellMode){
      this.LBL_COST_VALUE?.setText(String(this.getItemSellPrice(item)));
      if(isTSL){
        // Store matching count only — do not use the player item's Infinite flag.
        this.setStockValueText(this.countStoreStock(item), false);
        this.setOnHandValue(String(this.countPartyOnHand(item)));
      }else{
        // K1 has no on-hand label — stock is the selected inventory stack.
        // Infinite is store-stock only; party items always show StackSize.
        this.setStockValueText(item.getStackSize?.() || 1, false);
        this.setOnHandValue('');
      }
    }else{
      this.LBL_COST_VALUE?.setText(String(this.getItemBuyPrice(item)));
      this.setStockValueText(item.getStackSize?.() || 1, !!item.isInfinite?.());
      this.setOnHandValue(String(this.countPartyOnHand(item)));
    }
  }

  /** K2 override sets LBL_ONHAND_VALUE; K1 store.gui has no on-hand control. */
  setOnHandValue(_value: string){
    // no-op in K1
  }

  onItemSelected(item: ModuleItem){
    this.updateSelectedItemLabels(item);
    this.LB_DESCRIPTION.setItem(item.getPropertyDescription());
    this.LB_DESCRIPTION.show();
  }

  /**
   * SellItem — infinite store stock is copied with Infinite cleared
   * and StackSize=1 before AcquireItem.
   */
  buyItem(item: ModuleItem){
    if(!this.storeObject) return;
    const price = this.getItemBuyPrice(item);
    if(GameState.PartyManager.Gold < price){
      return;
    }
    GameState.PartyManager.AddGold(-price);
    this.LBL_CREDITS_VALUE?.setText(String(GameState.PartyManager.Gold || 0));
    // InventoryManager.addItem clears Infinite (SellItem / CreatureAcquireItem).
    GameState.InventoryManager.addItem(item.template, true);
    if(!item.isInfinite?.()){
      item.setStackSize(item.getStackSize() - 1);
      if(item.getStackSize() <= 0){
        const inv = this.storeObject.getInventory();
        const idx = inv.indexOf(item);
        if(idx >= 0){
          inv.splice(idx, 1);
        }
      }
    }
    this.show();
  }

  sellItem(item: ModuleItem){
    if(!this.storeObject) return;
    const price = this.getItemSellPrice(item);
    GameState.PartyManager.AddGold(price);
    this.LBL_CREDITS_VALUE?.setText(String(GameState.PartyManager.Gold || 0));
    GameState.InventoryManager.removeItem(item, 1);
    try{
      const sold = new GameState.Module.ModuleArea.ModuleItem(item.template);
      sold.initProperties?.();
      sold.setStackSize?.(1);
      // Sold player items are finite store stock, not Infinite.
      sold.setInfinite?.(0);
      const stacked = this.storeObject.addItem(sold);
      stacked.setPossessor?.(this.storeObject);
    }catch(_e){ /* optional stock return */ }
    this.show();
  }

  onAccept(){
    if(!this.storeObject) return;

    if(!this.sellMode){
      const selected = this.LB_SHOPITEMS?.selectedItem?.node;
      if(!isItem(selected)){
        return;
      }
      const item = selected as ModuleItem;
      const price = this.getItemBuyPrice(item);
      if(GameState.PartyManager.Gold < price){
        GameState.MenuManager.InGameConfirm.fromStringRef(TLK_CANT_AFFORD);
        return;
      }
      const threshold = this.getExpensiveThreshold(false);
      if(price > threshold){
        GameState.MenuManager.InGameConfirm.showConfirmDialog(TLK_CONFIRM_BUY, () => {
          this.buyItem(item);
        });
        return;
      }
      this.buyItem(item);
      return;
    }

    const selected = this.LB_INVITEMS?.selectedItem?.node;
    if(!isItem(selected)){
      return;
    }
    const item = selected as ModuleItem;
    const price = this.getItemSellPrice(item);
    const threshold = this.getExpensiveThreshold(true);
    if(price > threshold){
      GameState.MenuManager.InGameConfirm.showConfirmDialog(TLK_CONFIRM_SELL, () => {
        this.sellItem(item);
      });
      return;
    }
    this.sellItem(item);
  }

  getFilteredShopInventory(): ModuleItem[] {
    const inv = (this.storeObject?.getInventory() || []).filter((item) => this.checkFilter(item));
    return this.sortStoreItems(inv);
  }

  getFilteredSellInventory(): ModuleItem[] {
    const inv = GameState.InventoryManager.getSellableInventory().filter((item) => this.checkFilter(item));
    // Infinite is store-stock only; clear any leaked flags on party items before display.
    for(let i = 0; i < inv.length; i++){
      if(inv[i].isInfinite?.()){
        inv[i].setInfinite?.(0);
      }
    }
    return this.sortStoreItems(inv);
  }

  show() {
    super.show();
    if (isStore(this.storeObject)) {
      this.LB_DESCRIPTION.setItem(null);
      this.LB_DESCRIPTION.hide();
      this.LB_INVITEMS.hide();
      this.LB_SHOPITEMS.hide();
      if (this.sellMode) {
        this.BTN_Examine.setText(GameState.TLKManager.GetStringById(41937).Value);
        this.LBL_COST.setText(GameState.TLKManager.GetStringById(41945).Value);
        this.LBL_BUYSELL.setText(GameState.TLKManager.GetStringById(32130).Value);
        this.BTN_Accept.setText(GameState.TLKManager.GetStringById(32130).Value);
        const inv = this.getFilteredSellInventory();
        this.LB_INVITEMS.setItems(inv, {
          getItemOptions: (item: ModuleItem) => ({
            onClick: () => {
              this.onItemSelected(item);
            }
          }),
          selectIndex: 0,
        } as any);
        this.LB_INVITEMS.show();
        const first = inv[0];
        if(first){
          this.onItemSelected(first);
        }else{
          this.updateSelectedItemLabels(null);
        }
      } else {
        this.BTN_Examine.setText(GameState.TLKManager.GetStringById(41938).Value);
        this.LBL_COST.setText(GameState.TLKManager.GetStringById(41943).Value);
        this.LBL_BUYSELL.setText(GameState.TLKManager.GetStringById(32132).Value);
        this.BTN_Accept.setText(GameState.TLKManager.GetStringById(32132).Value);
        const inv = this.getFilteredShopInventory();
        this.LB_SHOPITEMS.setItems(inv, {
          getItemOptions: (item: ModuleItem) => ({
            onClick: () => {
              this.onItemSelected(item);
            }
          }),
          selectIndex: 0,
        } as any);
        this.LB_SHOPITEMS.show();
        const first = inv[0];
        if(first){
          this.onItemSelected(first);
        }else{
          this.updateSelectedItemLabels(null);
        }
      }
      this.LBL_CREDITS_VALUE.setText(String(GameState.PartyManager.Gold || 0));
    } else {
      this.close();
    }
  }
  
}
