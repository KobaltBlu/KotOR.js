/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuStore menu class.
 */

class MenuStore extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200store';
    this.voidFill = true;

    this.sellMode = false;

    this.LoadMenu({
      name: 'store',
      onLoad: () => {

        this.BTN_EXAMINE = this.getControlByName('BTN_Examine');
        this.BTN_ACCEPT = this.getControlByName('BTN_Accept');
        this.BTN_CANCEL = this.getControlByName('BTN_Cancel');
        
        this.LBL_STOCK = this.getControlByName('LBL_STOCK');
        this.LBL_STOCK_VALUE = this.getControlByName('LBL_STOCK_VALUE');
        this.LBL_COST = this.getControlByName('LBL_COST');
        this.LBL_COST_VALUE = this.getControlByName('LBL_COST_VALUE');
        this.LBL_CREDITS = this.getControlByName('LBL_CREDITS');
        this.LBL_CREDITS_VALUE = this.getControlByName('LBL_CREDITS_VALUE');
        this.LBL_BUYSELL = this.getControlByName('LBL_BUYSELL');
        this.LB_SHOPITEMS = this.getControlByName('LB_SHOPITEMS');
        this.LB_DESCRIPTION = this.getControlByName('LB_DESCRIPTION');
        this.LB_INVITEMS = this.getControlByName('LB_INVITEMS');

        this.BTN_CANCEL.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        this.BTN_EXAMINE.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sellMode = !this.sellMode;
          this.Show();
        });

        this.BTN_ACCEPT.addEventListener('click', (e) => {
          e.stopPropagation();
          if(!this.sellMode){
            if(this.LB_SHOPITEMS.selectedItem.node instanceof ModuleItem){
              let item = this.LB_SHOPITEMS.selectedItem.node;
              //Buy Mode
              let price = this.getItemBuyPrice(item);
              if(PartyManager.Gold >= price){
                PartyManager.Gold -= price;
                this.LBL_CREDITS_VALUE.setText(PartyManager.Gold || 0);
                InventoryManager.addItem(item.template, undefined, true);

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
            this.LBL_CREDITS_VALUE.setText(PartyManager.Gold || 0);
          }
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  getItemSellPrice(item = undefined){
    return item.cost + (item.cost * this.storeObject.getMarkUp());
  }

  getItemBuyPrice(item = undefined){
    return item.cost + (item.cost * this.storeObject.getMarkDown());
  }

  Open(storeObject = undefined, creature = undefined, bonusMarkUp = 0, bonusMarkDown = 0){
    this.storeObject = storeObject;
    this.creature = creature;
    this.bonusMarkUp = bonusMarkUp;
    this.bonusMarkDown = bonusMarkDown;
    super.Open();
  }

  Show(){
    super.Show();
    Game.MenuActive = true;

    if(this.storeObject instanceof ModuleStore){

      this.LB_DESCRIPTION.clearItems();

      this.LB_DESCRIPTION.hide();
      this.LB_INVITEMS.hide();
      this.LB_SHOPITEMS.hide();

      if(this.sellMode){
        this.BTN_EXAMINE.setText(Global.kotorTLK.GetStringById(41937));
        this.LBL_COST.setText(Global.kotorTLK.GetStringById(41945));
        this.LBL_BUYSELL.setText(Global.kotorTLK.GetStringById(32130));
        this.BTN_ACCEPT.setText(Global.kotorTLK.GetStringById(32130))
        this.LB_INVITEMS.clearItems();
        let inv = InventoryManager.getSellableInventory();
        for(let i = 0; i < inv.length; i++){
          this.LB_INVITEMS.addItem(inv[i], (item) => {
            this.LBL_COST_VALUE.setText(this.getItemSellPrice(item));
            this.LB_DESCRIPTION.clearItems();
            this.LB_DESCRIPTION.addItem(item.getDescription());
            this.LB_DESCRIPTION.updateList();
            this.LB_DESCRIPTION.show();
          });
        }
        this.LB_INVITEMS.select(this.LB_INVITEMS.children[0]);
        this.LB_INVITEMS.show();
      }else{
        this.BTN_EXAMINE.setText(Global.kotorTLK.GetStringById(41938));
        this.LBL_COST.setText(Global.kotorTLK.GetStringById(41943));
        this.LBL_BUYSELL.setText(Global.kotorTLK.GetStringById(32132));
        this.BTN_ACCEPT.setText(Global.kotorTLK.GetStringById(32132))
        this.LB_SHOPITEMS.clearItems();
        let inv = this.storeObject.getInventory();
        for(let i = 0; i < inv.length; i++){
          this.LB_SHOPITEMS.addItem(inv[i], (item) => {
            this.LBL_COST_VALUE.setText(this.getItemBuyPrice(item));
            this.LB_DESCRIPTION.clearItems();
            this.LB_DESCRIPTION.addItem(item.getDescription());
            this.LB_DESCRIPTION.updateList();
            this.LB_DESCRIPTION.show();
          });
        }
        this.LB_SHOPITEMS.select(this.LB_SHOPITEMS.children[0]);
        this.LB_SHOPITEMS.show();
      }

      this.LBL_CREDITS_VALUE.setText(PartyManager.Gold || 0);
      
      TextureLoader.LoadQueue();

    }else{
      this.Close();
    }

  }

}

module.exports = MenuStore;