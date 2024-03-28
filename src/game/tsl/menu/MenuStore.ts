import { GameState } from "../../../GameState";
import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { ModuleItem, ModuleStore } from "../../../module";
import { MenuStore as K1_MenuStore } from "../../kotor/KOTOR";

/**
 * MenuStore class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuStore.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuStore extends K1_MenuStore {

  declare LBL_BAR5: GUILabel;
  declare LB_INVITEMS: GUIListBox;
  declare LB_DESCRIPTION: GUIListBox;
  declare LB_SHOPITEMS: GUIListBox;
  declare LBL_BUYSELL: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare LBL_COST: GUILabel;
  declare LBL_STOCK: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_FILTER: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare BTN_Accept: GUIButton;
  declare BTN_Examine: GUIButton;
  declare LBL_COST_VALUE: GUILabel;
  declare LBL_CREDITS_VALUE: GUILabel;
  declare LBL_STOCK_VALUE: GUILabel;
  declare LBL_ONHAND: GUILabel;
  declare LBL_ONHAND_VALUE: GUILabel;
  declare BTN_ALL: GUIButton;
  declare BTN_WEAPONS: GUIButton;
  declare BTN_ARMOR: GUIButton;
  declare BTN_MISC: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'store_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
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
          if(this.LB_SHOPITEMS.selectedItem.node instanceof ModuleItem){
            let item = this.LB_SHOPITEMS.selectedItem.node;
            //Buy Mode
            let price = this.getItemBuyPrice(item);
            if(GameState.PartyManager.Gold >= price){
              GameState.PartyManager.Gold -= price;
              this.LBL_CREDITS_VALUE.setText(GameState.PartyManager.Gold || 0);
              GameState.InventoryManager.addItem(item.template, true);
              if(!item.isInfinite()){
                item.setStackSize(item.getStackSize() - 1);

                if(item.getStackSize() <= 0){
                  //Remove this item from the store if there are no more of them in stock
                  let idx = this.storeObject.getInventory().indexOf(item);
                  if(idx >= 0){
                    this.storeObject.getInventory().splice(idx, 1);
                    this.LB_SHOPITEMS.removeItemByIndex(idx);
                  }
                }

              }
            }
          }else{
            //You do not have enough credits message here
          }

        }else{
          //Sell Mode
          this.LBL_CREDITS_VALUE.setText((GameState.PartyManager.Gold || 0).toString());
        }
      });
      resolve();
    });
  }

  getItemSellPrice(item: ModuleItem) {
    return item.cost + item.cost * this.storeObject.getMarkUp();
  }

  getItemBuyPrice(item: ModuleItem) {
    return item.cost + item.cost * this.storeObject.getMarkDown();
  }

  open(){ //storeObject: ModuleStore, creature: ModuleCreature, bonusMarkUp = 0, bonusMarkDown = 0) {
    // this.storeObject = storeObject;
    // this.creature = creature;
    // this.bonusMarkUp = bonusMarkUp;
    // this.bonusMarkDown = bonusMarkDown;
    super.open();
  }

  show() {
    super.show();
    if (this.storeObject instanceof ModuleStore) {
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
          this.LB_INVITEMS.addItem(inv[i], { 
            onClick: (e, item: any) => {
              this.LBL_COST_VALUE.setText(this.getItemSellPrice(item));
              this.LB_DESCRIPTION.clearItems();
              this.LB_DESCRIPTION.addItem(item.getDescription());
              this.LB_DESCRIPTION.updateList();
              this.LB_DESCRIPTION.show();
            } 
          });
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
          this.LB_SHOPITEMS.addItem(inv[i], { 
            onClick: (e, item: any) => {
              this.LBL_COST_VALUE.setText(this.getItemBuyPrice(item));
              this.LB_DESCRIPTION.clearItems();
              this.LB_DESCRIPTION.addItem(item.getDescription());
              this.LB_DESCRIPTION.updateList();
              this.LB_DESCRIPTION.show();
            } 
          });
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
