import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { TextureLoader } from "@/loaders";
import { ModuleItem } from "@/module";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";

/**
 * MenuQuestItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuQuestItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuQuestItem extends GameMenu {

  LB_ITEM_DESCRIPTION: GUIListBox;
  LB_ITEMS: GUIListBox;
  LBL_TITLE: GUILabel;
  BTN_BACK: GUIButton;

  selected: ModuleItem;

  constructor(){
    super();
    this.gui_resref = 'questitem';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.childMenu = this.manager.MenuTop;
      this._button_b = this.BTN_BACK;

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        this.selected = item;
        this.UpdateSelected();
      };

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;
      resolve();
    });
  }

  UpdateSelected(){
    this.LB_ITEM_DESCRIPTION?.setItem(this.selected instanceof ModuleItem ? this.selected.getDescription() : null);
  }

  refreshList(){
    this.LB_ITEMS.selectedItem = undefined;

    const items = GameState.InventoryManager.getQuestInventory();
    this.LB_ITEMS.setItems(items);

    const nextSelected = items[0];
    if(nextSelected){
      this.selected = nextSelected;
      this.LB_ITEMS.selectItem(nextSelected);
    }else{
      this.selected = undefined;
      this.UpdateSelected();
    }

    TextureLoader.LoadQueue();
  }

  show() {
    super.show();
    this.refreshList();
  }

  triggerControllerDUpPress() {
    this.LB_ITEMS.directionalNavigate('up');
  }

  triggerControllerDDownPress() {
    this.LB_ITEMS.directionalNavigate('down');
  }
  
}
