import { GameState } from "../../../GameState";
import { ModuleObjectType } from "../../../enums/module/ModuleObjectType";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import type { ModuleCreature, ModuleItem, ModuleStore } from "../../../module";
import { BitWise } from "../../../utility/BitWise";

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
  sellMode: any;

  constructor(){
    super();
    this.gui_resref = 'store';
    this.background = '1600x1200store';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_Cancel.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_Examine.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sellMode = !this.sellMode;
        this.show();
      });

      this.BTN_Accept.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.sellMode){
          // Buy mode: transfer item from store to player inventory
          const selectedNode = this.LB_SHOPITEMS.selectedItem;
          if(selectedNode && selectedNode.node instanceof Object){
            const item: ModuleItem = selectedNode.node as ModuleItem;
            const price = this.getItemBuyPrice(item);
            if(GameState.PartyManager.Gold >= price){
              GameState.PartyManager.AddGold(-price);
              this.LBL_CREDITS_VALUE.setText(GameState.PartyManager.Gold || 0);
              GameState.InventoryManager.addItem(item.template, true);
              if(!item.isInfinite()){
                item.setStackSize(item.getStackSize() - 1);
                if(item.getStackSize() <= 0){
                  const idx = this.storeObject.getInventory().indexOf(item);
                  if(idx >= 0){
                    this.storeObject.getInventory().splice(idx, 1);
                    this.LB_SHOPITEMS.removeItemByIndex(idx);
                  }
                }else{
                  // Refresh display to show updated stack count
                  this.LB_SHOPITEMS.updateList();
                }
              }
            }
          }
        }else{
          // Sell mode: transfer item from player inventory to store
          const selectedNode = this.LB_INVITEMS.selectedItem;
          if(selectedNode && selectedNode.node instanceof Object){
            const item: ModuleItem = selectedNode.node as ModuleItem;
            const sellPrice = this.getItemSellPrice(item);
            GameState.PartyManager.AddGold(sellPrice);
            this.LBL_CREDITS_VALUE.setText(GameState.PartyManager.Gold || 0);
            GameState.InventoryManager.removeItem(item);
            this.storeObject.getInventory().push(item);
            const idx = this.LB_INVITEMS.listItems.indexOf(item);
            if(idx >= 0){
              this.LB_INVITEMS.removeItemByIndex(idx);
            }
          }
        }
      });

      resolve();
    });
  }

  getItemSellPrice(item: ModuleItem) {
    // Sell price: the store pays (markDown % of base cost) when player sells
    if(!this.storeObject) return Math.floor(item.cost);
    return Math.floor(item.cost * this.storeObject.getMarkDown());
  }

  getItemBuyPrice(item: ModuleItem) {
    // Buy price: player pays (base cost + markUp % premium) when buying from store
    if(!this.storeObject) return Math.floor(item.cost);
    return Math.floor(item.cost * (1 + this.storeObject.getMarkUp()));
  }

  setStoreObject(storeObject: ModuleStore){
    this.storeObject = storeObject;
  }

  setCustomerObject(creature: ModuleCreature){
    this.creature = creature;
  }

  setBonusMarkUp(bonusMarkUp: number = 0){
    this.bonusMarkUp = bonusMarkUp;
  }

  setBonusMarkDown(bonusMarkDown: number = 0){
    this.bonusMarkDown = bonusMarkDown;
  }

  show() {
    super.show();
    if (BitWise.InstanceOfObject(this.storeObject, ModuleObjectType.ModuleStore)) {
      this.LB_DESCRIPTION.clearItems();
      this.LB_DESCRIPTION.hide();
      this.LB_INVITEMS.hide();
      this.LB_SHOPITEMS.hide();
      if (this.sellMode) {
        this.BTN_Examine.setText(GameState.TLKManager.GetStringById(41937).Value);
        this.LBL_COST.setText(GameState.TLKManager.GetStringById(41945).Value);
        this.LBL_BUYSELL.setText(GameState.TLKManager.GetStringById(32130).Value);
        this.BTN_Accept.setText(GameState.TLKManager.GetStringById(32130).Value);
        this.LB_INVITEMS.clearItems();
        let inv = GameState.InventoryManager.getSellableInventory();
        for (let i = 0; i < inv.length; i++) {
          this.LB_INVITEMS.addItem(inv[i], { onClick: (e, item: ModuleItem) => {
            this.LBL_COST_VALUE.setText(this.getItemSellPrice(item));
            this.LB_DESCRIPTION.clearItems();
            this.LB_DESCRIPTION.addItem(item.getDescription());
            this.LB_DESCRIPTION.updateList();
            this.LB_DESCRIPTION.show();
          }});
        }
        this.LB_INVITEMS.select(this.LB_INVITEMS.children[0]);
        this.LB_INVITEMS.show();
      } else {
        this.BTN_Examine.setText(GameState.TLKManager.GetStringById(41938).Value);
        this.LBL_COST.setText(GameState.TLKManager.GetStringById(41943).Value);
        this.LBL_BUYSELL.setText(GameState.TLKManager.GetStringById(32132).Value);
        this.BTN_Accept.setText(GameState.TLKManager.GetStringById(32132).Value);
        this.LB_SHOPITEMS.clearItems();
        let inv = this.storeObject.getInventory();
        for (let i = 0; i < inv.length; i++) {
          this.LB_SHOPITEMS.addItem(inv[i], { onClick: (e, item: ModuleItem) => {
            this.LBL_COST_VALUE.setText(this.getItemBuyPrice(item));
            this.LB_DESCRIPTION.clearItems();
            this.LB_DESCRIPTION.addItem(item.getDescription());
            this.LB_DESCRIPTION.updateList();
            this.LB_DESCRIPTION.show();
          }});
        }
        this.LB_SHOPITEMS.select(this.LB_SHOPITEMS.children[0]);
        this.LB_SHOPITEMS.show();
      }
      this.LBL_CREDITS_VALUE.setText(GameState.PartyManager.Gold || 0);
      TextureLoader.LoadQueue();
    } else {
      this.close();
    }
  }
  
}
