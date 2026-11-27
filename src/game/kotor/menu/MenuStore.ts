import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { TextureLoader } from "@/loaders";
import { ModuleCreature, ModuleItem, ModuleStore } from "@/module";
import { BitWise } from "@/utility/BitWise";

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
  bonusMarkUp: number;
  bonusMarkDown: number;
  sellMode: boolean;

  constructor(){
    super();
    this.gui_resref = 'store';
    this.background = '1600x1200store';
    this.voidFill = true;
    this.bonusMarkUp = 0;
    this.bonusMarkDown = 0;
    this.sellMode = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_Cancel.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_Cancel;

      this.BTN_Examine.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTradeMode();
      });

      this.BTN_Accept.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.sellMode){
          this.sellSelectedItem();
        }else{
          this.buySelectedItem();
        }
      });
      this._button_a = this.BTN_Accept;

      resolve();
    });
  }

  setStoreObject(storeObject: ModuleStore){
    if(this.storeObject !== storeObject){
      this.sellMode = false;
    }
    this.storeObject = storeObject;
  }

  setCustomerObject(creature: ModuleCreature){
    this.creature = creature instanceof ModuleCreature ? creature : GameState.getCurrentPlayer();
  }

  setBonusMarkUp(bonusMarkUp: number = 0){
    this.bonusMarkUp = Number.isFinite(Number(bonusMarkUp)) ? Number(bonusMarkUp) : 0;
  }

  setBonusMarkDown(bonusMarkDown: number = 0){
    this.bonusMarkDown = Number.isFinite(Number(bonusMarkDown)) ? Number(bonusMarkDown) : 0;
  }

  protected getCurrentTrader(): ModuleCreature {
    return this.creature instanceof ModuleCreature ? this.creature : GameState.getCurrentPlayer();
  }

  protected normalizeInventoryIdentity(value: any): string {
    if(value === null || typeof value === 'undefined'){
      return '';
    }

    if(typeof value === 'string'){
      return value.replace(/\0[\s\S]*$/g, '').trim().toLowerCase();
    }

    return `${value}`;
  }

  protected merchantSellsToCustomer(): boolean {
    switch(Number(this.storeObject?.buySellFlag)){
      case 1:
        return true;
      case 2:
        return false;
      case 3:
        return true;
      default:
        return true;
    }
  }

  protected merchantBuysFromCustomer(): boolean {
    switch(Number(this.storeObject?.buySellFlag)){
      case 1:
        return false;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  }

  protected canToggleTradeMode(): boolean {
    return this.merchantSellsToCustomer() && this.merchantBuysFromCustomer();
  }

  protected syncTradeMode(){
    if(!this.merchantSellsToCustomer() && this.merchantBuysFromCustomer()){
      this.sellMode = true;
    }else if(this.merchantSellsToCustomer() && !this.merchantBuysFromCustomer()){
      this.sellMode = false;
    }
  }

  protected getEffectiveMarkUpMultiplier(): number {
    const markUp = Number(this.storeObject?.markUp || 0) + Number(this.bonusMarkUp || 0);
    return Math.max(0, markUp) * 0.01;
  }

  protected getEffectiveMarkDownMultiplier(): number {
    const markDown = Number(this.storeObject?.markDown || 0) + Number(this.bonusMarkDown || 0);
    return Math.max(0, markDown) * 0.01;
  }

  getItemSellPrice(item: ModuleItem) {
    return Math.max(0, Math.round((Number(item?.cost) || 0) * this.getEffectiveMarkDownMultiplier()));
  }

  getItemBuyPrice(item: ModuleItem) {
    return Math.max(0, Math.round((Number(item?.cost) || 0) * this.getEffectiveMarkUpMultiplier()));
  }

  protected isStoreItemVisible(item: ModuleItem): boolean {
    return item instanceof ModuleItem;
  }

  protected isCustomerItemVisible(item: ModuleItem): boolean {
    return item instanceof ModuleItem;
  }

  protected getStoreInventory(): ModuleItem[] {
    return (this.storeObject?.getInventory?.() || []).filter((item: ModuleItem) => this.isStoreItemVisible(item));
  }

  protected getCustomerInventory(): ModuleItem[] {
    const trader = this.getCurrentTrader();
    return GameState.InventoryManager.getSellableInventory(0, trader).filter((item: ModuleItem) => this.isCustomerItemVisible(item));
  }

  protected getActiveListBox(): GUIListBox {
    return this.sellMode ? this.LB_INVITEMS : this.LB_SHOPITEMS;
  }

  protected getSelectedTradeItem(): ModuleItem | undefined {
    const selectedNode = this.getActiveListBox()?.selectedItem?.node;
    return selectedNode instanceof ModuleItem ? selectedNode : undefined;
  }

  protected clearDescription(){
    this.LB_DESCRIPTION.setItem(null);
    this.LB_DESCRIPTION.hide();
  }

  protected getCustomerItemCount(item?: ModuleItem): number {
    if(!(item instanceof ModuleItem)){
      return 0;
    }

    const targetTag = this.normalizeInventoryIdentity(item.getTag());
    const targetTemplateResRef = this.normalizeInventoryIdentity(item.getTemplateResRef());
    const targetInventoryRes = this.normalizeInventoryIdentity(item.getInventoryRes());

    let count = 0;
    const inventory = GameState.InventoryManager.inventory || [];
    for(let i = 0; i < inventory.length; i++){
      const inventoryItem = inventory[i];
      if(!(inventoryItem instanceof ModuleItem)){
        continue;
      }

      const matchesTag = targetTag.length > 0 && this.normalizeInventoryIdentity(inventoryItem.getTag()) == targetTag;
      const matchesTemplateResRef = targetTemplateResRef.length > 0 && this.normalizeInventoryIdentity(inventoryItem.getTemplateResRef()) == targetTemplateResRef;
      const matchesInventoryRes = targetInventoryRes.length > 0 && this.normalizeInventoryIdentity(inventoryItem.getInventoryRes()) == targetInventoryRes;

      if(matchesTag || matchesTemplateResRef || matchesInventoryRes){
        count += inventoryItem.getStackSize();
      }
    }

    return count;
  }

  protected updateSelectedItemDetails(item?: ModuleItem){
    this.clearDescription();
    this.LBL_COST_VALUE.setText('');
    this.LBL_STOCK_VALUE.setText('');

    if(!(item instanceof ModuleItem)){
      return;
    }

    const price = this.sellMode ? this.getItemSellPrice(item) : this.getItemBuyPrice(item);
    this.LBL_COST_VALUE.setText(price.toString());
    this.LBL_STOCK_VALUE.setText(item.isInfinite() ? 'INF' : item.getStackSize().toString());

    const description = item.getDescription();
    if(typeof description !== 'undefined' && description !== null && description !== ''){
      this.LB_DESCRIPTION.setItem(description);
      this.LB_DESCRIPTION.show();
    }
  }

  protected populateList(list: GUIListBox, items: ModuleItem[] = []){
    list.selectedItem = undefined;
    list.onSelected = (item: ModuleItem) => {
      this.updateSelectedItemDetails(item);
    };

    list.setItems(items);

    if(list.children.length > 0){
      list.select(list.children[0]);
      this.updateSelectedItemDetails(this.getSelectedTradeItem());
      list.show();
    }else{
      this.updateSelectedItemDetails(undefined);
      list.hide();
    }
  }

  protected sanitizePurchasedItem(item: ModuleItem): ModuleItem {
    const purchasedItem = item.clone();
    purchasedItem.setStackSize(1);
    purchasedItem.infinite = 0;
    if(purchasedItem.template?.RootNode?.hasField('Infinite')){
      purchasedItem.template.RootNode.getFieldByLabel('Infinite').setValue(0);
    }
    return purchasedItem;
  }

  protected buySelectedItem(): boolean {
    const item = this.getSelectedTradeItem();
    if(!(item instanceof ModuleItem) || !this.merchantSellsToCustomer()){
      return false;
    }

    const price = this.getItemBuyPrice(item);
    if(GameState.PartyManager.Gold < price){
      return false;
    }

    GameState.PartyManager.AddGold(-price);

    const purchasedItem = this.sanitizePurchasedItem(item);
    const customer = this.getCurrentTrader();
    if(customer instanceof ModuleCreature){
      customer.addItem(purchasedItem);
    }else{
      GameState.InventoryManager.addItem(purchasedItem);
    }

    if(!item.isInfinite()){
      const remainingStock = item.getStackSize() - 1;
      if(remainingStock <= 0){
        const idx = this.storeObject.getInventory().indexOf(item);
        if(idx >= 0){
          this.storeObject.getInventory().splice(idx, 1);
        }
      }else{
        item.setStackSize(remainingStock);
      }
    }

    this.refreshView();
    return true;
  }

  protected sellSelectedItem(): boolean {
    const item = this.getSelectedTradeItem();
    const trader = this.getCurrentTrader();
    if(!(item instanceof ModuleItem) || !(trader instanceof ModuleCreature) || !this.merchantBuysFromCustomer()){
      return false;
    }

    const removedItem = trader.removeItem(item, 1);
    if(!(removedItem instanceof ModuleItem)){
      return false;
    }

    GameState.PartyManager.AddGold(this.getItemSellPrice(item));
    this.storeObject.addItem(removedItem);
    this.refreshView();
    return true;
  }

  protected toggleTradeMode(){
    if(!this.canToggleTradeMode()){
      return;
    }

    this.sellMode = !this.sellMode;
    this.refreshView();
  }

  protected updateModeButtons(){
    if(this.sellMode){
      this.BTN_Examine.setText(GameState.TLKManager.GetStringById(41937).Value);
      this.LBL_COST.setText(GameState.TLKManager.GetStringById(41945).Value);
      this.LBL_BUYSELL.setText(GameState.TLKManager.GetStringById(32130).Value);
      this.BTN_Accept.setText(GameState.TLKManager.GetStringById(32130).Value);
    }else{
      this.BTN_Examine.setText(GameState.TLKManager.GetStringById(41938).Value);
      this.LBL_COST.setText(GameState.TLKManager.GetStringById(41943).Value);
      this.LBL_BUYSELL.setText(GameState.TLKManager.GetStringById(32132).Value);
      this.BTN_Accept.setText(GameState.TLKManager.GetStringById(32132).Value);
    }

    if(this.canToggleTradeMode()){
      this.BTN_Examine.show();
    }else{
      this.BTN_Examine.hide();
    }
  }

  refreshView(){
    if (!BitWise.InstanceOfObject(this.storeObject, ModuleObjectType.ModuleStore)) {
      this.close();
      return;
    }

    this.syncTradeMode();

    this.clearDescription();
    this.LB_INVITEMS.hide();
    this.LB_SHOPITEMS.hide();
    this.LB_INVITEMS.setItems([]);
    this.LB_SHOPITEMS.setItems([]);

    this.updateModeButtons();

    if(this.sellMode){
      this.populateList(this.LB_INVITEMS, this.getCustomerInventory());
    }else{
      this.populateList(this.LB_SHOPITEMS, this.getStoreInventory());
    }

    this.LBL_CREDITS_VALUE.setText((GameState.PartyManager.Gold || 0).toString());
    this.updateFilterButtons();
    TextureLoader.LoadQueue();
  }

  protected updateFilterButtons(){
    // Implemented in TSL.
  }

  show() {
    super.show();
    this.refreshView();
  }
  
}
