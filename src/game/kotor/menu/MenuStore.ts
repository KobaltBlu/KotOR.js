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
      resolve();
    });
  }

  getItemSellPrice(item: ModuleItem) {
    return item.cost + item.cost * this.storeObject.getMarkUp();
  }

  getItemBuyPrice(item: ModuleItem) {
    return item.cost + item.cost * this.storeObject.getMarkDown();
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
